'use strict';

const { xyToHex, miredToKelvin, decodeRemoteZone } = require('./color-utils');

/**
 * Button number → semantic name
 *
 *  {Record<number, string>}
 */
const BUTTON_NAMES = {
	1: 'onOff',
	2: 'brightnessUp',
	3: 'brightnessDown',
	4: 'colorTempWarm',
	5: 'colorTempCold',
	6: 'colorWheel',
	7: 'scene1',
	8: 'scene2',
	9: 'scene3',
	10: 'scene4',
};

/**
 * Last digit of buttonevent → press type
 *
 *  {Record<number, string>}
 */
const PRESS_TYPES = {
	1: 'hold',
	2: 'short',
	3: 'release',
};

/**
 * Handles all Tint Remote (ZBT-Remote-ALL-RGBW) WebSocket events
 * and maps them to ioBroker states.
 */
class RemoteHandler {
	/**
	 * @param {object} adapter - ioBroker adapter instance
	 * @param {(sensorId: string, x: number, y: number, hex: string, angle: number) => Promise<void>} [onColorWheel] - Optional callback invoked on color wheel events
	 */
	constructor(adapter, onColorWheel) {
		this.adapter = adapter;
		this.onColorWheel = onColorWheel || null;
		this._stopped = false;
		this.adapter.log.debug('RemoteHandler initialised');
	}

	/**
	 * Stop the handler — prevents further state writes after adapter unload.
	 */
	stop() {
		this.adapter.log.debug('RemoteHandler: stopping (no further state writes)');
		this._stopped = true;
	}

	// ─── Main entry point ─────────────────────────────────────────────────────

	/**
	 * Process a deCONZ WebSocket sensor-changed event.
	 *
	 * @param {string} sensorId - deCONZ sensor id
	 * @param {object} state - event.state containing buttonevent and optional xy/angle/colortemp
	 * @param {object} [config] - event.config (may contain group and battery)
	 * @param {object} [attr] - event.attr (may contain lastseen)
	 */
	async handleEvent(sensorId, state, config, attr) {
		if (this._stopped) {
			this.adapter.log.debug(`RemoteHandler: ignoring event for sensor ${sensorId} — handler is stopped`);
			return;
		}
		if (!state || state.buttonevent === undefined) {
			this.adapter.log.debug(`RemoteHandler: sensor ${sensorId} — no buttonevent in state, ignoring`);
			return;
		}

		const code = state.buttonevent;
		const buttonNum = Math.floor(code / 1000);
		const actionCode = code % 10;
		const buttonName = BUTTON_NAMES[buttonNum] || `button${buttonNum}`;
		const pressType = PRESS_TYPES[actionCode] || 'unknown';

		this.adapter.log.info(
			`Remote ${sensorId}: button "${buttonName}" ${pressType} ` +
				`(code=${code}, buttonNum=${buttonNum}, actionCode=${actionCode})`,
		);

		const prefix = `remotes.${sensorId}`;

		// ── Always update base button states ──────────────────────────────────
		await this._setState(`${prefix}.button.lastEvent`, code);
		await this._setState(`${prefix}.button.lastEventName`, buttonName);
		await this._setState(`${prefix}.button.pressType`, pressType);

		// ── Zone from config.group ────────────────────────────────────────────
		const groupStr = config?.group || state.group || null;
		if (groupStr !== null) {
			const zone = decodeRemoteZone(String(groupStr));
			this.adapter.log.debug(`Remote ${sensorId}: zone=${zone} (config.group="${groupStr}")`);
			await this._setState(`${prefix}.button.activeZone`, zone);
		} else {
			this.adapter.log.debug(`Remote ${sensorId}: no group info in event — activeZone not updated`);
		}

		// ── lastSeen / battery from attr/config ───────────────────────────────
		if (attr?.lastseen) {
			this.adapter.log.debug(`Remote ${sensorId}: lastSeen="${attr.lastseen}"`);
			await this._setState(`${prefix}.info.lastSeen`, attr.lastseen);
		}
		if (config?.battery !== undefined) {
			this.adapter.log.debug(`Remote ${sensorId}: battery=${config.battery}%`);
			await this._setState(`${prefix}.info.battery`, config.battery);
		}

		// ── Specialised handlers ──────────────────────────────────────────────
		if (buttonNum === 6) {
			this.adapter.log.debug(`Remote ${sensorId}: dispatching to color-wheel handler`);
			await this._handleColorWheel(sensorId, prefix, state);
		} else if (buttonNum === 4 || buttonNum === 5) {
			this.adapter.log.debug(`Remote ${sensorId}: dispatching to color-temperature handler`);
			await this._handleColorTemp(prefix, state, pressType);
		}
	}

	// ─── Color wheel ──────────────────────────────────────────────────────────

	/**
	 * Handle a color wheel event (buttonevent 6002).
	 * Decodes xy and angle, writes color states, fires trigger pulse and optional callback.
	 *
	 * @param {string} sensorId - deCONZ sensor id
	 * @param {string} prefix - ioBroker state path prefix e.g. "remotes.21"
	 * @param {object} state - deCONZ sensor state containing xy and angle
	 */
	async _handleColorWheel(sensorId, prefix, state) {
		const xy = state.xy;
		const angle = state.angle;

		if (!Array.isArray(xy) || xy.length < 2) {
			this.adapter.log.warn(
				`Remote ${sensorId}: color-wheel event has no xy data — state=${JSON.stringify(state)}`,
			);
			return;
		}

		const [x, y] = xy;
		const hex = xyToHex(x, y);

		this.adapter.log.debug(
			`Remote ${sensorId}: color wheel — angle=${angle}°, ` + `xy=[${x.toFixed(4)}, ${y.toFixed(4)}], hex=${hex}`,
		);

		await this._setState(`${prefix}.colorWheel.angle`, angle ?? null);
		await this._setState(`${prefix}.colorWheel.x`, x);
		await this._setState(`${prefix}.colorWheel.y`, y);
		await this._setState(`${prefix}.colorWheel.hex`, hex);

		// Trigger-pulse: true for 250 ms → scripts/Blockly can react
		this.adapter.log.debug(`Remote ${sensorId}: firing colorWheel.triggered pulse (250 ms)`);
		await this._setState(`${prefix}.colorWheel.triggered`, true);
		this.adapter.setTimeout(async () => {
			if (!this._stopped) {
				await this._setState(`${prefix}.colorWheel.triggered`, false);
			}
		}, 250);

		// Optional callback → adapter can auto-apply color to bound lights
		if (this.onColorWheel) {
			this.adapter.log.debug(`Remote ${sensorId}: invoking onColorWheel callback`);
			await this.onColorWheel(sensorId, x, y, hex, angle);
		}
	}

	// ─── Color temperature ────────────────────────────────────────────────────

	/**
	 * Handle a color temperature button event (buttons 4 and 5).
	 * Writes mired, Kelvin, and press type to the colorTemp channel.
	 *
	 * @param {string} prefix - ioBroker state path prefix e.g. "remotes.21"
	 * @param {object} state - deCONZ sensor state containing colortemp in Mired
	 * @param {string} pressType - "short" | "hold" | "release"
	 */
	async _handleColorTemp(prefix, state, pressType) {
		const mired = state.colortemp;
		if (mired === undefined) {
			this.adapter.log.debug(`${prefix}: color-temp event has no colortemp field — skipping`);
			return;
		}

		const kelvin = miredToKelvin(mired);
		this.adapter.log.debug(`${prefix}: color temperature — ${mired} mired = ${kelvin} K (${pressType})`);

		await this._setState(`${prefix}.colorTemp.mired`, mired);
		await this._setState(`${prefix}.colorTemp.value`, kelvin);
		await this._setState(`${prefix}.colorTemp.pressType`, pressType);
	}

	// ─── Helper ───────────────────────────────────────────────────────────────

	/**
	 * Write a state value with ack:true, swallowing errors to prevent adapter crash.
	 *
	 * @param {string} id - Full ioBroker state id
	 * @param {unknown} val - Value to set
	 */
	async _setState(id, val) {
		this.adapter.log.debug(`setState ${id} = ${JSON.stringify(val)}`);
		try {
			await this.adapter.setStateAsync(id, { val, ack: true });
		} catch (err) {
			this.adapter.log.warn(`setState ${id} failed: ${err.message}`);
		}
	}
}

module.exports = RemoteHandler;
