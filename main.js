'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.5
 * Extended with deCONZ/ConBee integration for Müller Licht tint
 */

const utils = require('@iobroker/adapter-core');
const DeconzApi = require('./lib/deconz-api');
const DeconzWebSocket = require('./lib/deconz-ws');
const RemoteHandler = require('./lib/remote-handler');
const { briToPercent, percentToBri, miredToKelvin, kelvinToMired, xyToHex, hexToXy } = require('./lib/color-utils');
const {
	lightDevice,
	lightInfoChannel,
	lightStateChannel,
	LIGHT_STATES,
	groupDevice,
	groupInfoChannel,
	groupActionChannel,
	groupScenesChannel,
	GROUP_INFO_STATES,
	GROUP_ACTION_STATES,
	remoteDevice,
	remoteChannel,
	REMOTE_INFO_STATES,
	REMOTE_BUTTON_STATES,
	REMOTE_COLORWHEEL_STATES,
	REMOTE_COLORTEMP_STATES,
	buildStateObj,
} = require('./lib/objects');

class Tint extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	constructor(options) {
		super({
			...options,
			name: 'tint',
		});

		this._api = null;
		this._ws = null;
		this._remote = null;
		this._pollTimer = null;
		this._stopped = false;

		this._lightMap = {};
		this._groupMap = {};
		this._remoteMap = {};
		this._sceneMap = {};

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Lifecycle
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.setState('info.connection', false, true);

		const { ip, port, wsPort, apiKey, pollingInterval, watchdogMinutes, autoApplyColorWheel, transitionTime } =
			this.config;

		this.log.info(
			`Adapter starting — ` +
				`deCONZ REST: ${ip}:${port || 80}, ` +
				`WebSocket: ${ip}:${wsPort || 443}, ` +
				`poll: ${pollingInterval || 60}s, ` +
				`watchdog: ${watchdogMinutes || 120}min, ` +
				`transitionTime: ${transitionTime ?? 4}×100ms, ` +
				`autoColorWheel: ${autoApplyColorWheel}`,
		);
		this.log.debug(`API key configured: ${apiKey ? `yes (${apiKey.length} chars)` : 'NOT SET'}`);

		if (!ip || !apiKey) {
			this.log.warn(
				'Adapter not fully configured — IP address or API key is missing. ' +
					'Use the "deCONZ Pairing" button in the adapter settings to obtain the API key.',
			);
			// Subscribe to a dummy pattern so adapter-core keeps the event loop alive
			// and onMessage() remains reachable for the pairing sendTo command.
			await this.subscribeStatesAsync('info.connection');
			return;
		}

		this.log.debug(`Creating DeconzApi instance for http://${ip}:${port || 80}/api/<key>`);
		this._api = new DeconzApi({
			ip,
			port: port || 80,
			apiKey,
			log: this.log,
		});

		this.log.debug('Testing deCONZ connection...');
		const ok = await this._api.testConnection();
		if (!ok) {
			this.log.error(
				`Cannot connect to deCONZ at ${ip}:${port || 80} — ` +
					'verify that the IP address, port, and API key are correct, ' +
					'and that the deCONZ gateway is reachable.',
			);
			return;
		}
		this.setState('info.connection', true, true);
		this.log.info(`Successfully connected to deCONZ at ${ip}:${port || 80}`);

		this.log.debug('Creating RemoteHandler');
		this._remote = new RemoteHandler(this, this._onColorWheelEvent.bind(this));

		this.log.info('Starting device discovery...');
		await this._discoverAll();

		this.log.debug(`Opening WebSocket to ws://${ip}:${wsPort || 443}`);
		this._ws = new DeconzWebSocket({
			ip,
			wsPort: wsPort || 443,
			log: this.log,
			onEvent: this._onWsEvent.bind(this),
			onOpen: () => {
				this.log.debug('WebSocket onOpen callback — setting info.connection=true');
				this.setState('info.connection', true, true);
			},
			onClose: () => {
				this.log.debug('WebSocket onClose callback — setting info.connection=false');
				this.setState('info.connection', false, true);
			},
		});
		this._ws.connect();

		this.log.info('Subscribing to state changes: lights.*.state.*, groups.*.action.*, groups.*.scenes.*');
		await this.subscribeStatesAsync('lights.*.state.*');
		await this.subscribeStatesAsync('groups.*.action.*');
		await this.subscribeStatesAsync('groups.*.scenes.*');

		this.log.debug(`Scheduling fallback poll every ${pollingInterval || 60}s`);
		this._schedulePoll();

		this.log.info('Adapter ready');
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param {() => void} callback - Callback function
	 */
	onUnload(callback) {
		this.log.info('Adapter stopping — cleaning up resources');
		try {
			this._stopped = true;

			if (this._remote) {
				this.log.debug('Stopping RemoteHandler');
				this._remote.stop();
			}
			if (this._ws) {
				this.log.debug('Closing WebSocket connection');
				this._ws.close();
			}
			if (this._pollTimer) {
				this.log.debug('Clearing fallback poll timer');
				this.clearTimeout(this._pollTimer);
				this._pollTimer = null;
			}

			this.setState('info.connection', false, true);
			this.log.info('Adapter stopped — all resources cleaned up');
			callback();
		} catch (error) {
			this.log.error(`Error during adapter unload: ${error.message}`);
			callback();
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Discovery
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Discover all deCONZ resources and create ioBroker objects.
	 */
	async _discoverAll() {
		this.log.debug('Starting full device discovery (lights → groups → remotes)');
		await this._discoverLights();
		await this._discoverGroups();
		await this._discoverRemotes();
		this.log.info(
			`Discovery complete: ` +
				`${Object.keys(this._lightMap).length} light(s), ` +
				`${Object.keys(this._groupMap).length} group(s), ` +
				`${Object.keys(this._remoteMap).length} remote(s)`,
		);
	}

	/**
	 * Discover all lights and create their state objects.
	 */
	async _discoverLights() {
		try {
			this.log.debug('Discovering lights...');
			const lights = await this._api.getLights();
			for (const [id, light] of Object.entries(lights)) {
				this._lightMap[id] = light.name;
				this.log.debug(
					`  Light ${id}: "${light.name}" — ` +
						`model=${light.modelid || 'unknown'}, ` +
						`manufacturer=${light.manufacturername || 'unknown'}, ` +
						`reachable=${light.state?.reachable}, ` +
						`on=${light.state?.on}, ` +
						`bri=${light.state?.bri}`,
				);
				await this._createLightObjects(id, light);
				await this._updateLightStates(id, light);
			}
			const count = Object.keys(lights).length;
			const names = Object.values(lights)
				.map(l => `"${l.name}"`)
				.join(', ');
			this.log.info(`Discovered ${count} light(s): ${names}`);
		} catch (err) {
			this.log.error(`Light discovery failed: ${err.message}`);
		}
	}

	/**
	 * Discover all groups including their scenes and create state objects.
	 */
	async _discoverGroups() {
		try {
			this.log.debug('Discovering groups...');
			const groups = await this._api.getGroups();
			for (const [id, group] of Object.entries(groups)) {
				const sceneMap = {};
				if (Array.isArray(group.scenes)) {
					for (const sc of group.scenes) {
						sceneMap[sc.name] = sc.id;
					}
				}
				this._groupMap[id] = { name: group.name, scenes: sceneMap };
				this._sceneMap[id] = sceneMap;
				const sceneNames = Object.keys(sceneMap);
				this.log.debug(
					`  Group ${id}: "${group.name}" — ` +
						`members=[${(group.lights || []).join(', ')}], ` +
						`scenes=[${sceneNames.join(', ') || '(none)'}]`,
				);
				await this._createGroupObjects(id, group);
				await this._updateGroupStates(id, group);
			}
			const count = Object.keys(groups).length;
			const names = Object.values(groups)
				.map(g => `"${g.name}"`)
				.join(', ');
			this.log.info(`Discovered ${count} group(s): ${names}`);
		} catch (err) {
			this.log.error(`Group discovery failed: ${err.message}`);
		}
	}

	/**
	 * Discover all sensors (remotes) and create state objects.
	 */
	async _discoverRemotes() {
		try {
			this.log.debug('Discovering remote sensors...');
			const sensors = await this._api.getSensors();
			for (const [id, sensor] of Object.entries(sensors)) {
				if (!sensor.type || !sensor.type.includes('Switch')) {
					this.log.debug(`  Sensor ${id}: "${sensor.name}" type="${sensor.type}" — not a Switch, skipping`);
					continue;
				}
				this._remoteMap[id] = sensor.name;
				this.log.debug(
					`  Remote ${id}: "${sensor.name}" — ` +
						`type=${sensor.type}, ` +
						`battery=${sensor.config?.battery}%, ` +
						`reachable=${sensor.config?.reachable}`,
				);
				await this._createRemoteObjects(id, sensor);
				await this._updateRemoteInfo(id, sensor);
			}
			const count = Object.keys(this._remoteMap).length;
			const names = Object.values(this._remoteMap)
				.map(n => `"${n}"`)
				.join(', ');
			this.log.info(`Discovered ${count} remote(s): ${names || '(none)'}`);
		} catch (err) {
			this.log.error(`Remote discovery failed: ${err.message}`);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Object creation
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Create all ioBroker objects for a light.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _createLightObjects(id, light) {
		this.log.debug(`Creating/updating objects for light ${id} ("${light.name}")`);
		await this.extendObjectAsync(`lights.${id}`, lightDevice(id, light.name));
		await this.extendObjectAsync(`lights.${id}.info`, lightInfoChannel(id));
		await this.extendObjectAsync(`lights.${id}.state`, lightStateChannel(id));
		for (const def of LIGHT_STATES) {
			await this.extendObjectAsync(`lights.${id}.${def.sub}`, buildStateObj(`lights.${id}`, def));
		}
		this.log.debug(`Objects for light ${id} ready`);
	}

	/**
	 * Create all ioBroker objects for a group including scene boolean states.
	 *
	 * @param {string} id - deCONZ group id
	 * @param {object} group - deCONZ group object
	 */
	async _createGroupObjects(id, group) {
		this.log.debug(`Creating/updating objects for group ${id} ("${group.name}")`);
		await this.extendObjectAsync(`groups.${id}`, groupDevice(id, group.name));
		await this.extendObjectAsync(`groups.${id}.info`, groupInfoChannel(id));
		await this.extendObjectAsync(`groups.${id}.action`, groupActionChannel(id));
		await this.extendObjectAsync(`groups.${id}.scenes`, groupScenesChannel(id));
		for (const def of GROUP_INFO_STATES) {
			await this.extendObjectAsync(`groups.${id}.${def.sub}`, buildStateObj(`groups.${id}`, def));
		}
		for (const def of GROUP_ACTION_STATES) {
			await this.extendObjectAsync(`groups.${id}.${def.sub}`, buildStateObj(`groups.${id}`, def));
		}
		const sceneMap = this._sceneMap[id] || {};
		for (const sceneName of Object.keys(sceneMap)) {
			const safeKey = sceneName.replace(/[^a-zA-Z0-9_]/g, '_');
			this.log.debug(`  Creating scene state: groups.${id}.scenes.${safeKey} ("${sceneName}")`);
			await this.extendObjectAsync(`groups.${id}.scenes.${safeKey}`, {
				_id: `groups.${id}.scenes.${safeKey}`,
				type: 'state',
				common: {
					name: sceneName,
					type: 'boolean',
					role: 'button',
					read: true,
					write: true,
					def: false,
				},
				native: { sceneName },
			});
		}
		this.log.debug(`Objects for group ${id} ready (${Object.keys(sceneMap).length} scene(s))`);
	}

	/**
	 * Create all ioBroker objects for a remote sensor.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _createRemoteObjects(id, sensor) {
		this.log.debug(`Creating/updating objects for remote ${id} ("${sensor.name}")`);
		await this.extendObjectAsync(`remotes.${id}`, remoteDevice(id, sensor.name));
		for (const [sub, name] of [
			['info', 'Info'],
			['button', 'Button'],
			['colorWheel', 'Color Wheel'],
			['colorTemp', 'Color Temp'],
		]) {
			await this.extendObjectAsync(`remotes.${id}.${sub}`, remoteChannel(id, sub, name));
		}
		for (const def of [
			...REMOTE_INFO_STATES,
			...REMOTE_BUTTON_STATES,
			...REMOTE_COLORWHEEL_STATES,
			...REMOTE_COLORTEMP_STATES,
		]) {
			await this.extendObjectAsync(`remotes.${id}.${def.sub}`, buildStateObj(`remotes.${id}`, def));
		}
		this.log.debug(`Objects for remote ${id} ready`);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// State sync helpers
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Sync all states of a single light from its deCONZ object.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _updateLightStates(id, light) {
		const s = light.state || {};
		const p = `lights.${id}`;

		this.log.debug(
			`Syncing light ${id} ("${light.name}"): ` +
				`on=${s.on}, bri=${s.bri} (${briToPercent(s.bri ?? 0)}%), ` +
				`ct=${s.ct}mired, colormode=${s.colormode || 'n/a'}, ` +
				`reachable=${s.reachable}`,
		);

		await this._set(`${p}.info.name`, light.name);
		await this._set(`${p}.info.modelid`, light.modelid || '');
		await this._set(`${p}.info.manufacturer`, light.manufacturername || '');
		await this._set(`${p}.info.reachable`, s.reachable ?? false);
		await this._set(`${p}.info.uniqueid`, light.uniqueid || '');
		await this._set(`${p}.state.on`, s.on ?? false);
		await this._set(`${p}.state.brightness`, briToPercent(s.bri ?? 0));
		await this._set(`${p}.state.colorMode`, s.colormode || '');

		if (s.ct !== undefined) {
			await this._set(`${p}.state.colorTemp`, miredToKelvin(s.ct));
		}
		if (s.hue !== undefined) {
			await this._set(`${p}.state.hue`, s.hue);
		}
		if (s.sat !== undefined) {
			await this._set(`${p}.state.saturation`, s.sat);
		}
		if (Array.isArray(s.xy)) {
			await this._set(`${p}.state.x`, s.xy[0]);
			await this._set(`${p}.state.y`, s.xy[1]);
			await this._set(`${p}.state.hex`, xyToHex(s.xy[0], s.xy[1], s.bri));
		}
		if (s.effect !== undefined) {
			await this._set(`${p}.state.effect`, s.effect);
		}
		if (s.colorspeed !== undefined) {
			await this._set(`${p}.state.effectSpeed`, s.colorspeed);
		}
	}

	/**
	 * Sync all states of a single group from its deCONZ object.
	 *
	 * @param {string} id - deCONZ group id
	 * @param {object} group - deCONZ group object
	 */
	async _updateGroupStates(id, group) {
		const st = group.state || {};
		const act = group.action || {};
		const p = `groups.${id}`;

		this.log.debug(
			`Syncing group ${id} ("${group.name}"): ` +
				`allOn=${st.all_on}, anyOn=${st.any_on}, ` +
				`action.on=${act.on}, action.bri=${act.bri} (${briToPercent(act.bri ?? 0)}%), ` +
				`action.ct=${act.ct}mired`,
		);

		await this._set(`${p}.info.name`, group.name);
		await this._set(`${p}.info.memberCount`, (group.lights || []).length);
		await this._set(`${p}.info.allOn`, st.all_on ?? false);
		await this._set(`${p}.info.anyOn`, st.any_on ?? false);
		await this._set(`${p}.action.on`, act.on ?? false);
		await this._set(`${p}.action.brightness`, briToPercent(act.bri ?? 0));
		if (act.ct !== undefined) {
			await this._set(`${p}.action.colorTemp`, miredToKelvin(act.ct));
		}
		if (Array.isArray(act.xy)) {
			await this._set(`${p}.action.hex`, xyToHex(act.xy[0], act.xy[1], act.bri));
		}
		if (act.effect !== undefined) {
			await this._set(`${p}.action.effect`, act.effect);
		}
	}

	/**
	 * Sync info states of a remote sensor.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _updateRemoteInfo(id, sensor) {
		const p = `remotes.${id}`;

		this.log.debug(
			`Syncing remote ${id} ("${sensor.name}"): ` +
				`reachable=${sensor.config?.reachable}, ` +
				`battery=${sensor.config?.battery}%, ` +
				`lastSeen=${sensor.lastseen || 'n/a'}`,
		);

		await this._set(`${p}.info.name`, sensor.name);
		await this._set(`${p}.info.reachable`, sensor.config?.reachable ?? false);
		if (sensor.config?.battery !== undefined) {
			await this._set(`${p}.info.battery`, sensor.config.battery);
		}
		if (sensor.lastseen) {
			await this._set(`${p}.info.lastSeen`, sensor.lastseen);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// WebSocket event handler
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Handle a deCONZ WebSocket push event.
	 *
	 * @param {object} event - Parsed WebSocket event object
	 */
	async _onWsEvent(event) {
		if (!event || !event.e || !event.r || !event.id) {
			this.log.debug(`WS event ignored — missing required fields: ${JSON.stringify(event)}`);
			return;
		}
		const { e, r, id, state, action, config, attr } = event;

		this.log.debug(`Processing WS event: e="${e}" r="${r}" id="${id}"`);

		if (e === 'changed') {
			if (r === 'lights' && state) {
				this.log.debug(`WS light ${id} state changed: ${JSON.stringify(state)}`);
				await this._applyLightStateUpdate(id, state);
			} else if (r === 'groups') {
				if (state) {
					this.log.debug(`WS group ${id} state changed: ${JSON.stringify(state)}`);
					await this._applyGroupStateUpdate(id, state);
				}
				if (action) {
					this.log.debug(`WS group ${id} action changed: ${JSON.stringify(action)}`);
					await this._applyGroupActionUpdate(id, action);
				}
				if (!state && !action) {
					this.log.debug(`WS group ${id} changed event has no state or action payload — skipping`);
				}
			} else if (r === 'sensors' && state && state.buttonevent !== undefined) {
				this.log.debug(`WS sensor ${id} button event: ${state.buttonevent} — dispatching to RemoteHandler`);
				await this._remote.handleEvent(id, state, config, attr);
			} else {
				this.log.debug(`WS changed event for r="${r}" id="${id}" has no relevant payload — skipping`);
			}
		} else if (e === 'added') {
			this.log.info(`WS: new ${r} (id=${id}) detected — triggering full re-discovery`);
			await this._discoverAll();
		} else if (e === 'deleted') {
			this.log.info(`WS: ${r} id=${id} was removed from deCONZ — re-discovering to update object tree`);
			await this._discoverAll();
		} else {
			this.log.debug(`WS event type "${e}" for r="${r}" id="${id}" — no handler, ignoring`);
		}
	}

	/**
	 * Apply a partial light state update received via WebSocket.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} s - Partial state object
	 */
	async _applyLightStateUpdate(id, s) {
		if (!this._lightMap[id]) {
			this.log.debug(`WS: light ${id} not in lightMap — skipping state update`);
			return;
		}
		const name = this._lightMap[id];
		const p = `lights.${id}`;
		this.log.debug(`Applying WS state update for light ${id} ("${name}"): ${JSON.stringify(s)}`);

		if (s.on !== undefined) {
			await this._set(`${p}.state.on`, s.on);
		}
		if (s.bri !== undefined) {
			await this._set(`${p}.state.brightness`, briToPercent(s.bri));
		}
		if (s.ct !== undefined) {
			await this._set(`${p}.state.colorTemp`, miredToKelvin(s.ct));
		}
		if (s.hue !== undefined) {
			await this._set(`${p}.state.hue`, s.hue);
		}
		if (s.sat !== undefined) {
			await this._set(`${p}.state.saturation`, s.sat);
		}
		if (Array.isArray(s.xy)) {
			await this._set(`${p}.state.x`, s.xy[0]);
			await this._set(`${p}.state.y`, s.xy[1]);
			await this._set(`${p}.state.hex`, xyToHex(s.xy[0], s.xy[1]));
		}
		if (s.reachable !== undefined) {
			this.log.debug(`Light ${id} ("${name}") reachability changed: ${s.reachable}`);
			await this._set(`${p}.info.reachable`, s.reachable);
		}
		if (s.colormode !== undefined) {
			await this._set(`${p}.state.colorMode`, s.colormode);
		}
		if (s.effect !== undefined) {
			await this._set(`${p}.state.effect`, s.effect);
		}
		if (s.colorspeed !== undefined) {
			await this._set(`${p}.state.effectSpeed`, s.colorspeed);
		}
	}

	/**
	 * Apply a partial group state update received via WebSocket.
	 *
	 * @param {string} id - deCONZ group id
	 * @param {object} s - Partial state object (all_on, any_on)
	 */
	async _applyGroupStateUpdate(id, s) {
		if (!this._groupMap[id]) {
			this.log.debug(`WS: group ${id} not in groupMap — skipping state update`);
			return;
		}
		const name = this._groupMap[id].name;
		this.log.debug(`Applying WS state update for group ${id} ("${name}"): ${JSON.stringify(s)}`);
		const p = `groups.${id}`;
		if (s.all_on !== undefined) {
			await this._set(`${p}.info.allOn`, s.all_on);
		}
		if (s.any_on !== undefined) {
			await this._set(`${p}.info.anyOn`, s.any_on);
		}
	}

	/**
	 * Apply a partial group action update received via WebSocket.
	 *
	 * @param {string} id - deCONZ group id
	 * @param {object} a - Partial action object
	 */
	async _applyGroupActionUpdate(id, a) {
		if (!this._groupMap[id]) {
			this.log.debug(`WS: group ${id} not in groupMap — skipping action update`);
			return;
		}
		const name = this._groupMap[id].name;
		this.log.debug(`Applying WS action update for group ${id} ("${name}"): ${JSON.stringify(a)}`);
		const p = `groups.${id}`;
		if (a.on !== undefined) {
			await this._set(`${p}.action.on`, a.on);
		}
		if (a.bri !== undefined) {
			await this._set(`${p}.action.brightness`, briToPercent(a.bri));
		}
		if (a.ct !== undefined) {
			await this._set(`${p}.action.colorTemp`, miredToKelvin(a.ct));
		}
		if (Array.isArray(a.xy)) {
			await this._set(`${p}.action.hex`, xyToHex(a.xy[0], a.xy[1], a.bri));
		}
		if (a.effect !== undefined) {
			await this._set(`${p}.action.effect`, a.effect);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Admin message handler (sendTo)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Handle sendTo messages from the admin UI.
	 *
	 * @param {ioBroker.Message} obj - Message object
	 */
	async onMessage(obj) {
		if (!obj || !obj.command) {
			this.log.debug('onMessage: received empty or command-less message — ignoring');
			return;
		}

		this.log.debug(
			`Admin command received: "${obj.command}" from "${obj.from}"${
				obj.message ? `  data=${JSON.stringify(obj.message)}` : ''
			}`,
		);

		const respond = result => {
			if (obj.callback) {
				this.log.debug(`Responding to "${obj.command}": ${JSON.stringify(result).slice(0, 200)}`);
				this.sendTo(obj.from, obj.command, result, obj.callback);
			} else {
				this.log.debug(`No callback for "${obj.command}" — response discarded`);
			}
		};

		// pair does not require an existing connection — it IS how the connection is bootstrapped.
		// Polls deCONZ every 3 s until the pairing window is detected (null → retry)
		// or up to 60 s (matching deCONZ's own pairing window duration).
		if (obj.command === 'pair') {
			const ip = (obj.message?.ip || this.config.ip || '').trim();
			const port = Number(obj.message?.port) || Number(this.config.port) || 80;
			this.log.info(`Pairing command received — target: ${ip}:${port}`);
			if (!ip) {
				this.log.warn('Pairing aborted — no IP address available (not in message and not configured)');
				respond({ error: 'IP address is required. Please enter the deCONZ IP address first.' });
				return;
			}
			const POLL_MS = 3000;
			const TIMEOUT_MS = 60000;
			const deadline = Date.now() + TIMEOUT_MS;
			let attempt = 0;

			const tryPair = async () => {
				attempt++;
				this.log.debug(`Pairing attempt #${attempt} — POST http://${ip}:${port}/api`);
				try {
					const apiKey = await DeconzApi.pair(ip, port, this.log);
					if (apiKey !== null) {
						this.log.info(`Pairing successful after ${attempt} attempt(s) — API key received`);
						respond({ apiKey });
						return;
					}
					// null = pairing window not open yet
					const remaining = Math.ceil((deadline - Date.now()) / 1000);
					if (Date.now() >= deadline) {
						this.log.warn(
							`Pairing timed out after ${attempt} attempt(s) — ` +
								'pairing window was never detected within 60 s',
						);
						respond({
							error: 'Pairing timeout (60 s). Please open the pairing window in deCONZ/Phoscon first.',
						});
						return;
					}
					this.log.debug(
						`Pairing: window not yet open — retrying in ${POLL_MS / 1000}s ` + `(${remaining}s remaining)`,
					);
					setTimeout(tryPair, POLL_MS);
				} catch (err) {
					this.log.error(`Pairing failed on attempt #${attempt}: ${err.message}`);
					respond({ error: err.message });
				}
			};
			tryPair();
			return;
		}

		if (!this._api) {
			this.log.warn(`Command "${obj.command}" received but adapter is not connected to deCONZ`);
			respond({ error: 'Adapter not connected to deCONZ' });
			return;
		}

		try {
			switch (obj.command) {
				case 'getLights':
					this.log.debug('Admin: returning light list');
					respond({ lights: await this._api.getLights() });
					break;

				case 'getGroups':
					this.log.debug('Admin: returning group list');
					respond({ groups: await this._api.getGroups() });
					break;

				case 'createGroup': {
					this.log.info(
						`Admin: create group command — name="${obj.message.name}", ` +
							`lights=[${(obj.message.lights || []).join(', ')}]`,
					);
					const res = await this._api.createGroup(obj.message.name, obj.message.lights || []);
					this.log.debug('Admin: re-discovering groups after create');
					await this._discoverGroups();
					respond({ ok: true, result: res });
					break;
				}

				case 'updateGroup': {
					this.log.info(
						`Admin: update group command — id=${obj.message.id}, ` +
							`name="${obj.message.name}", lights=[${(obj.message.lights || []).join(', ')}]`,
					);
					await this._api.updateGroup(obj.message.id, obj.message.name, obj.message.lights || []);
					this.log.debug('Admin: re-discovering groups after update');
					await this._discoverGroups();
					respond({ ok: true });
					break;
				}

				case 'deleteGroup': {
					this.log.info(`Admin: delete group command — id=${obj.message.id}`);
					await this._api.deleteGroup(obj.message.id);
					this.log.debug('Admin: re-discovering groups after delete');
					await this._discoverGroups();
					respond({ ok: true });
					break;
				}

				default:
					this.log.warn(`Admin: unknown command "${obj.command}" — no handler registered`);
					respond({ error: `Unknown command: ${obj.command}` });
			}
		} catch (err) {
			this.log.error(`Admin command "${obj.command}" failed: ${err.message}`);
			respond({ error: err.message });
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// State change handler
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Is called if a subscribed state changes.
	 *
	 * @param {string} id - State ID
	 * @param {ioBroker.State | null | undefined} state - State object
	 */
	async onStateChange(id, state) {
		if (!state || state.ack) {
			return;
		}
		if (this._stopped) {
			this.log.debug(`State change for ${id} ignored — adapter is stopping`);
			return;
		}

		// tint.0.lights.3.state.on  → parts[2]=lights, [3]=id, [4]=channel, [5]=name
		const parts = id.split('.');
		const resource = parts[2];
		const deconzId = parts[3];
		const channel = parts[4];
		const stateName = parts[5];

		this.log.debug(
			`State change: ${id} = ${JSON.stringify(state.val)} ` +
				`(resource=${resource}, deconzId=${deconzId}, channel=${channel}, state=${stateName})`,
		);

		try {
			if (resource === 'lights' && channel === 'state') {
				await this._handleLightCommand(deconzId, stateName, state.val);
			} else if (resource === 'groups') {
				if (channel === 'action') {
					await this._handleGroupCommand(deconzId, stateName, state.val);
				} else if (channel === 'scenes') {
					await this._handleSceneCommand(deconzId, stateName, state.val, id);
				}
			} else {
				this.log.debug(`State change for resource "${resource}" not handled`);
			}
		} catch (err) {
			this.log.error(`Command failed for ${id}: ${err.message}`);
		}
	}

	/**
	 * Send a command to a single light.
	 *
	 * @param {string} lightId - deCONZ light id
	 * @param {string} stateName - State name e.g. "on", "brightness"
	 * @param {unknown} val - New value
	 */
	async _handleLightCommand(lightId, stateName, val) {
		const transitionTime = this.config.transitionTime ?? 4;
		const name = this._lightMap[lightId] || `id=${lightId}`;
		let body = {};

		switch (stateName) {
			case 'on':
				body = { on: Boolean(val) };
				this.log.info(`Light ${lightId} ("${name}"): switched ${val ? 'ON' : 'OFF'}`);
				break;
			case 'brightness':
				body = { on: true, bri: percentToBri(Number(val)), transitiontime: transitionTime };
				this.log.info(
					`Light ${lightId} ("${name}"): brightness → ${val}% ` +
						`(bri=${percentToBri(Number(val))}, transition=${transitionTime}×100ms)`,
				);
				break;
			case 'colorTemp':
				body = { ct: kelvinToMired(Number(val)), transitiontime: transitionTime };
				this.log.info(
					`Light ${lightId} ("${name}"): color temperature → ${val}K ` +
						`(${kelvinToMired(Number(val))} mired)`,
				);
				break;
			case 'hue':
				body = { hue: Number(val), transitiontime: transitionTime };
				this.log.debug(`Light ${lightId} ("${name}"): hue → ${val}`);
				break;
			case 'saturation':
				body = { sat: Number(val), transitiontime: transitionTime };
				this.log.debug(`Light ${lightId} ("${name}"): saturation → ${val}`);
				break;
			case 'hex': {
				const [x, y] = hexToXy(String(val));
				body = { xy: [x, y], transitiontime: transitionTime };
				this.log.info(
					`Light ${lightId} ("${name}"): color → ${val} ` + `(xy=[${x.toFixed(4)}, ${y.toFixed(4)}])`,
				);
				break;
			}
			case 'x':
			case 'y': {
				const xState = await this.getStateAsync(`lights.${lightId}.state.x`);
				const yState = await this.getStateAsync(`lights.${lightId}.state.y`);
				const xVal = stateName === 'x' ? Number(val) : (xState?.val ?? 0);
				const yVal = stateName === 'y' ? Number(val) : (yState?.val ?? 0);
				body = { xy: [xVal, yVal], transitiontime: transitionTime };
				this.log.debug(
					`Light ${lightId} ("${name}"): CIE ${stateName} → ${val} ` +
						`(xy=[${xVal.toFixed(4)}, ${yVal.toFixed(4)}])`,
				);
				break;
			}
			case 'effect':
				body = { effect: String(val) };
				this.log.info(`Light ${lightId} ("${name}"): effect → "${val}"`);
				break;
			case 'effectSpeed':
				body = { colorspeed: Number(val) };
				this.log.debug(`Light ${lightId} ("${name}"): effectSpeed → ${val}`);
				break;
			default:
				this.log.warn(`Light ${lightId} ("${name}"): unknown state "${stateName}" — no API call made`);
				return;
		}

		this.log.debug(`Light ${lightId} ("${name}"): PUT /lights/${lightId}/state ${JSON.stringify(body)}`);
		await this._api.setLightState(lightId, body);
	}

	/**
	 * Send an action command to a group.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {string} stateName - State name e.g. "on", "brightness"
	 * @param {unknown} val - New value
	 */
	async _handleGroupCommand(groupId, stateName, val) {
		const transitionTime = this.config.transitionTime ?? 4;
		const name = this._groupMap[groupId]?.name || `id=${groupId}`;
		let body = {};

		switch (stateName) {
			case 'on':
				body = { on: Boolean(val) };
				this.log.info(`Group ${groupId} ("${name}"): switched ${val ? 'ON' : 'OFF'}`);
				break;
			case 'brightness':
				body = { on: true, bri: percentToBri(Number(val)), transitiontime: transitionTime };
				this.log.info(
					`Group ${groupId} ("${name}"): brightness → ${val}% ` +
						`(bri=${percentToBri(Number(val))}, transition=${transitionTime}×100ms)`,
				);
				break;
			case 'colorTemp':
				body = { ct: kelvinToMired(Number(val)), transitiontime: transitionTime };
				this.log.info(
					`Group ${groupId} ("${name}"): color temperature → ${val}K ` +
						`(${kelvinToMired(Number(val))} mired)`,
				);
				break;
			case 'hex': {
				const [x, y] = hexToXy(String(val));
				body = { xy: [x, y], transitiontime: transitionTime };
				this.log.info(
					`Group ${groupId} ("${name}"): color → ${val} ` + `(xy=[${x.toFixed(4)}, ${y.toFixed(4)}])`,
				);
				break;
			}
			case 'effect':
				body = { effect: String(val) };
				this.log.info(`Group ${groupId} ("${name}"): effect → "${val}"`);
				break;
			case 'activateScene': {
				const sceneMap = this._sceneMap[groupId] || {};
				const sceneId = sceneMap[String(val)];
				this.log.debug(
					`Group ${groupId} ("${name}"): activateScene "${val}" — ` +
						`sceneId=${sceneId !== undefined ? sceneId : 'NOT FOUND'}, ` +
						`available: [${Object.keys(sceneMap).join(', ')}]`,
				);
				if (sceneId === undefined) {
					this.log.warn(
						`Group ${groupId} ("${name}"): scene "${val}" not found — ` +
							`available scenes: [${Object.keys(sceneMap).join(', ')}]`,
					);
					return;
				}
				await this._api.recallScene(groupId, sceneId);
				this.log.info(`Group ${groupId} ("${name}"): recalled scene "${val}" (id=${sceneId})`);
				return;
			}
			default:
				this.log.warn(`Group ${groupId} ("${name}"): unknown action "${stateName}" — no API call made`);
				return;
		}

		this.log.debug(`Group ${groupId} ("${name}"): PUT /groups/${groupId}/action ${JSON.stringify(body)}`);
		await this._api.setGroupAction(groupId, body);
	}

	/**
	 * Recall a scene by setting its boolean state to true.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {string} safeSceneName - URL-safe scene name (key in state tree)
	 * @param {unknown} val - Must be true to trigger
	 * @param {string} fullId - Full ioBroker state id (used to read native.sceneName)
	 */
	async _handleSceneCommand(groupId, safeSceneName, val, fullId) {
		if (!val) {
			this.log.debug(`Scene state ${fullId} set to false — no action`);
			return;
		}
		const obj = await this.getObjectAsync(fullId);
		const sceneName = obj?.native?.sceneName || safeSceneName;
		const sceneMap = this._sceneMap[groupId] || {};
		const sceneId = sceneMap[sceneName];
		const groupName = this._groupMap[groupId]?.name || `id=${groupId}`;

		this.log.debug(
			`Scene trigger: group ${groupId} ("${groupName}"), ` +
				`sceneName="${sceneName}", sceneId=${sceneId !== undefined ? sceneId : 'NOT FOUND'}, ` +
				`all scenes: [${Object.keys(sceneMap).join(', ')}]`,
		);

		if (sceneId === undefined) {
			this.log.warn(
				`Scene "${sceneName}" not found in group ${groupId} ("${groupName}") — ` +
					`available: [${Object.keys(sceneMap).join(', ')}]`,
			);
			return;
		}
		await this._api.recallScene(groupId, sceneId);
		this.log.info(`Group ${groupId} ("${groupName}"): recalled scene "${sceneName}" (id=${sceneId})`);
		for (const name of Object.keys(sceneMap)) {
			const safe = name.replace(/[^a-zA-Z0-9_]/g, '_');
			await this._set(`groups.${groupId}.scenes.${safe}`, name === sceneName);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Color wheel auto-apply
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Called by RemoteHandler on color wheel events.
	 * When autoApplyColorWheel is enabled, applies the chosen color to the
	 * active zone's light group.
	 *
	 * @param {string} sensorId - deCONZ sensor id
	 * @param {number} x - CIE x chromaticity
	 * @param {number} y - CIE y chromaticity
	 * @param {string} _hex - Pre-computed hex color (unused here)
	 * @param {number} _angle - Wheel angle (unused here)
	 */
	async _onColorWheelEvent(sensorId, x, y, _hex, _angle) {
		if (!this.config.autoApplyColorWheel) {
			this.log.debug(`Color wheel event from sensor ${sensorId} — autoApplyColorWheel is disabled, skipping`);
			return;
		}

		const zoneState = await this.getStateAsync(`remotes.${sensorId}.button.activeZone`);
		const zone = zoneState?.val ?? 0;
		const ZONE_GROUPS = { 1: '16388', 2: '16389', 3: '16390' };

		if (zone === 0) {
			this.log.debug(
				`Color wheel auto-apply: sensor=${sensorId}, zone=0 (all lights), ` +
					`xy=[${x.toFixed(4)}, ${y.toFixed(4)}], hex=${_hex}, ` +
					`applying to ${Object.keys(this._lightMap).length} light(s)`,
			);
			for (const lightId of Object.keys(this._lightMap)) {
				this.log.debug(`  → light ${lightId} ("${this._lightMap[lightId]}")`);
				await this._api
					.setLightState(lightId, {
						xy: [x, y],
						on: true,
						transitiontime: this.config.transitionTime ?? 4,
					})
					.catch(err => {
						this.log.warn(`Color wheel: failed to apply to light ${lightId}: ${err.message}`);
					});
			}
		} else {
			const groupNum = ZONE_GROUPS[zone];
			this.log.debug(
				`Color wheel auto-apply: sensor=${sensorId}, zone=${zone} → groupId=${groupNum}, ` +
					`xy=[${x.toFixed(4)}, ${y.toFixed(4)}], hex=${_hex}`,
			);
			let applied = false;
			for (const [groupId] of Object.entries(this._groupMap)) {
				if (groupNum && groupId === groupNum) {
					const groupName = this._groupMap[groupId]?.name || groupId;
					this.log.debug(`  → group ${groupId} ("${groupName}")`);
					await this._api
						.setGroupAction(groupId, {
							xy: [x, y],
							on: true,
							transitiontime: this.config.transitionTime ?? 4,
						})
						.catch(err => {
							this.log.warn(`Color wheel: failed to apply to group ${groupId}: ${err.message}`);
						});
					applied = true;
					break;
				}
			}
			if (!applied) {
				this.log.debug(
					`Color wheel: zone ${zone} maps to groupId=${groupNum} but that group is not in groupMap`,
				);
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Fallback polling (setTimeout chain)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Schedule the next fallback poll using a setTimeout chain.
	 * Never uses setInterval to avoid request pile-up.
	 */
	_schedulePoll() {
		if (this._stopped) {
			this.log.debug('_schedulePoll called after stop — not scheduling');
			return;
		}
		const interval = (this.config.pollingInterval || 60) * 1000;
		this.log.debug(`Fallback poll scheduled in ${interval / 1000}s`);
		this._pollTimer = this.setTimeout(async () => {
			this._pollTimer = null;
			if (!this._stopped) {
				await this._pollAll();
				this._schedulePoll();
			}
		}, interval);
	}

	/**
	 * Poll all lights and groups from deCONZ REST API.
	 */
	async _pollAll() {
		const lightCount = Object.keys(this._lightMap).length;
		const groupCount = Object.keys(this._groupMap).length;
		this.log.debug(`Fallback poll starting — ${lightCount} light(s), ${groupCount} group(s)`);
		try {
			const lights = await this._api.getLights();
			let lightUpdated = 0;
			for (const [id, light] of Object.entries(lights)) {
				if (this._lightMap[id]) {
					await this._updateLightStates(id, light);
					lightUpdated++;
				} else {
					this.log.debug(`Poll: light ${id} not in lightMap — skipping (run discovery first)`);
				}
			}
			const groups = await this._api.getGroups();
			let groupUpdated = 0;
			for (const [id, group] of Object.entries(groups)) {
				if (this._groupMap[id]) {
					await this._updateGroupStates(id, group);
					groupUpdated++;
				} else {
					this.log.debug(`Poll: group ${id} not in groupMap — skipping (run discovery first)`);
				}
			}
			this.log.debug(`Fallback poll complete — updated ${lightUpdated} light(s), ${groupUpdated} group(s)`);
		} catch (err) {
			this.log.warn(
				`Fallback poll failed: ${err.message} — ` + `will retry in ${this.config.pollingInterval || 60}s`,
			);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Utility
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Set a state value with ack:true, swallowing errors gracefully.
	 *
	 * @param {string} id - Full ioBroker state id
	 * @param {unknown} val - Value to write
	 */
	async _set(id, val) {
		try {
			await this.setStateAsync(id, { val: val ?? null, ack: true });
		} catch (err) {
			this.log.warn(`setStateAsync ${id} failed: ${err.message}`);
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	module.exports = options => new Tint(options);
} else {
	// otherwise start the instance directly
	new Tint();
}
