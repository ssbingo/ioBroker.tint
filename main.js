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
const { isPlug, isCover, isTintRemote } = require('./lib/device-category');
const { trimLightForAdmin, trimGroupForAdmin } = require('./lib/admin-projections');
const {
	lightDevice,
	lightInfoChannel,
	lightStateChannel,
	LIGHT_STATES,
	plugDevice,
	plugInfoChannel,
	plugStateChannel,
	PLUG_STATES,
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
	switchDevice,
	switchChannel,
	SWITCH_INFO_STATES,
	SWITCH_BUTTON_STATES,
	sensorDevice,
	sensorChannel,
	SENSOR_INFO_STATES,
	SENSOR_VALUE_STATES,
	SENSOR_GENERIC_VALUE_STATE,
	coverDevice,
	coverInfoChannel,
	coverStateChannel,
	COVER_STATES,
	thermostatDevice,
	thermostatInfoChannel,
	thermostatStateChannel,
	THERMOSTAT_STATES,
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
		this._rediscoverTimer = null;
		this._stopped = false;

		this._lightMap = {};
		this._plugMap = {};
		this._coverMap = {};
		this._groupMap = {};
		this._remoteMap = {};
		this._switchMap = {};
		this._sensorMap = {};
		this._thermostatMap = {};
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
		const gatewayConfig = await this._api.getConfig();
		if (!gatewayConfig || !gatewayConfig.name) {
			this.log.error(
				`Cannot connect to deCONZ at ${ip}:${port || 80} — ` +
					'verify that the IP address, port, and API key are correct, ' +
					'and that the deCONZ gateway is reachable.',
			);
			return;
		}
		this.log.info(
			`Gateway info — name: "${gatewayConfig.name}", firmware: ${gatewayConfig.swversion || 'n/a'}, ` +
				`model: ${gatewayConfig.modelid || 'unknown'}, api: v${gatewayConfig.apiversion || 'n/a'}`,
		);
		this.setState('info.connection', true, true);
		this.log.info(`Successfully connected to deCONZ at ${ip}:${port || 80}`);

		// deCONZ reports the websocket port it actually listens on; this is authoritative
		// and frequently differs from any value the user guessed/configured.
		const effectiveWsPort = gatewayConfig.websocketport || wsPort || 443;
		if (gatewayConfig.websocketport && gatewayConfig.websocketport !== wsPort) {
			this.log.info(
				`deCONZ reports websocket port ${gatewayConfig.websocketport} ` +
					`(configured: ${wsPort || 'default 443'}) — using the port reported by deCONZ`,
			);
		}

		this.log.debug('Creating RemoteHandler');
		this._remote = new RemoteHandler(this, this._onColorWheelEvent.bind(this));

		this.log.info('Starting device discovery...');
		await this._discoverAll();

		this.log.debug(`Opening WebSocket to ws://${ip}:${effectiveWsPort}`);
		this._ws = new DeconzWebSocket({
			ip,
			wsPort: effectiveWsPort,
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

		this.log.info(
			'Subscribing to state changes: lights.*.state.*, plugs.*.state.*, covers.*.state.*, ' +
				'thermostats.*.state.setpoint, groups.*.action.*, groups.*.scenes.*',
		);
		await this.subscribeStatesAsync('lights.*.state.*');
		await this.subscribeStatesAsync('plugs.*.state.*');
		await this.subscribeStatesAsync('covers.*.state.*');
		await this.subscribeStatesAsync('thermostats.*.state.setpoint');
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
			if (this._rediscoverTimer) {
				this.log.debug('Clearing pending re-discovery timer');
				this.clearTimeout(this._rediscoverTimer);
				this._rediscoverTimer = null;
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
		const startedAt = Date.now();
		this.log.debug('Starting full device discovery (lights → groups → remotes)');
		// Reset before re-populating so removed devices/groups/scenes don't
		// linger in memory — _reconcileObjectTree() relies on these reflecting
		// exactly what deCONZ reports right now.
		this._lightMap = {};
		this._plugMap = {};
		this._coverMap = {};
		this._groupMap = {};
		this._remoteMap = {};
		this._switchMap = {};
		this._sensorMap = {};
		this._thermostatMap = {};
		this._sceneMap = {};
		await this._discoverLights();
		await this._discoverGroups();
		await this._discoverRemotes();
		await this._reconcileObjectTree();
		const elapsedMs = Date.now() - startedAt;
		this.log.info(
			`Discovery complete in ${elapsedMs} ms: ` +
				`${Object.keys(this._lightMap).length} light(s), ` +
				`${Object.keys(this._plugMap).length} plug(s), ` +
				`${Object.keys(this._coverMap).length} cover(s), ` +
				`${Object.keys(this._groupMap).length} group(s), ` +
				`${Object.keys(this._remoteMap).length} remote(s), ` +
				`${Object.keys(this._switchMap).length} switch(es), ` +
				`${Object.keys(this._sensorMap).length} sensor(s), ` +
				`${Object.keys(this._thermostatMap).length} thermostat(s)`,
		);
		if (elapsedMs > 3000) {
			this.log.warn(
				`Discovery took ${elapsedMs} ms — unusually slow. This can momentarily strain the ioBroker ` +
					'host (large objects-DB write burst) and is worth investigating if it happens repeatedly.',
			);
		}
	}

	/**
	 * Discover all lights, smart plugs, and window coverings, creating their
	 * state objects under lights.*, plugs.*, or covers.* respectively.
	 */
	async _discoverLights() {
		try {
			this.log.debug('Discovering lights...');
			const lights = await this._api.getLights();
			for (const [id, light] of Object.entries(lights)) {
				const category = isPlug(light) ? 'Plug' : isCover(light) ? 'Cover' : 'Light';
				this.log.debug(
					`  ${category} ${id}: "${light.name}" — ` +
						`model=${light.modelid || 'unknown'}, ` +
						`manufacturer=${light.manufacturername || 'unknown'}, ` +
						`reachable=${light.state?.reachable}, ` +
						`on=${light.state?.on}, ` +
						`bri=${light.state?.bri}`,
				);
				if (isPlug(light)) {
					this._plugMap[id] = light.name;
					await this._createPlugObjects(id, light);
					await this._updatePlugStates(id, light);
				} else if (isCover(light)) {
					this._coverMap[id] = light.name;
					await this._createCoverObjects(id, light);
					await this._updateCoverStates(id, light);
				} else {
					this._lightMap[id] = light.name;
					await this._createLightObjects(id, light);
					await this._updateLightStates(id, light);
				}
			}
			const count = Object.keys(lights).length;
			const names = Object.values(lights)
				.map(l => `"${l.name}"`)
				.join(', ');
			this.log.info(`Discovered ${count} light(s)/plug(s)/cover(s): ${names}`);
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
	 * Discover all sensors and create state objects: Tint remotes (remotes.*),
	 * generic Zigbee switches (switches.*), thermostats (thermostats.*), and
	 * everything else as a read-only sensor (sensors.*).
	 */
	async _discoverRemotes() {
		try {
			this.log.debug('Discovering sensors...');
			const sensors = await this._api.getSensors();
			for (const [id, sensor] of Object.entries(sensors)) {
				if (sensor.type === 'ZHAThermostat') {
					this._thermostatMap[id] = sensor.name;
					this.log.debug(`  Thermostat ${id}: "${sensor.name}" — battery=${sensor.config?.battery}%`);
					await this._createThermostatObjects(id, sensor);
					await this._updateThermostatStates(id, sensor);
				} else if (sensor.type && sensor.type.includes('Switch')) {
					if (isTintRemote(sensor)) {
						this._remoteMap[id] = sensor.name;
						this.log.debug(
							`  Remote ${id}: "${sensor.name}" — ` +
								`type=${sensor.type}, ` +
								`battery=${sensor.config?.battery}%, ` +
								`reachable=${sensor.config?.reachable}`,
						);
						await this._createRemoteObjects(id, sensor);
						await this._updateRemoteInfo(id, sensor);
					} else {
						this._switchMap[id] = sensor.name;
						this.log.debug(
							`  Switch ${id}: "${sensor.name}" — ` +
								`type=${sensor.type}, manufacturer=${sensor.manufacturername || 'unknown'}`,
						);
						await this._createSwitchObjects(id, sensor);
						await this._updateSwitchInfo(id, sensor);
					}
				} else {
					this._sensorMap[id] = sensor.name;
					this.log.debug(`  Sensor ${id}: "${sensor.name}" — type=${sensor.type}`);
					await this._createSensorObjects(id, sensor);
					await this._updateSensorStates(id, sensor);
				}
			}
			const count = Object.keys(sensors).length;
			this.log.info(
				`Discovered ${count} sensor(s) total: ` +
					`${Object.keys(this._remoteMap).length} remote(s), ` +
					`${Object.keys(this._switchMap).length} switch(es), ` +
					`${Object.keys(this._sensorMap).length} sensor(s), ` +
					`${Object.keys(this._thermostatMap).length} thermostat(s)`,
			);
		} catch (err) {
			this.log.error(`Sensor discovery failed: ${err.message}`);
		}
	}

	/**
	 * Remove ioBroker objects under the lights/plugs/covers/groups/remotes/
	 * switches/sensors/thermostats namespaces that no longer correspond to
	 * anything deCONZ reported in the discovery that just ran (e.g. a deleted
	 * light, a renamed/removed scene). Relies on all the _xxxMap fields having
	 * just been reset and fully re-populated by _discoverLights/
	 * _discoverGroups/_discoverRemotes.
	 */
	async _reconcileObjectTree() {
		try {
			const expected = new Set([
				...Object.keys(this._lightMap).map(id => `lights.${id}`),
				...Object.keys(this._plugMap).map(id => `plugs.${id}`),
				...Object.keys(this._coverMap).map(id => `covers.${id}`),
				...Object.keys(this._groupMap).map(id => `groups.${id}`),
				...Object.keys(this._remoteMap).map(id => `remotes.${id}`),
				...Object.keys(this._switchMap).map(id => `switches.${id}`),
				...Object.keys(this._sensorMap).map(id => `sensors.${id}`),
				...Object.keys(this._thermostatMap).map(id => `thermostats.${id}`),
			]);
			const prefixes = [
				'lights.',
				'plugs.',
				'covers.',
				'groups.',
				'remotes.',
				'switches.',
				'sensors.',
				'thermostats.',
			];
			const devices = await this.getDevicesAsync();
			for (const dev of devices) {
				const relId = dev._id.slice(this.namespace.length + 1);
				if (!prefixes.some(p => relId.startsWith(p))) {
					continue;
				}
				if (!expected.has(relId)) {
					this.log.info(`Removing stale object tree "${relId}" (no longer present in deCONZ)`);
					await this.delObjectAsync(relId, { recursive: true });
				}
			}

			// Orphaned scene states inside groups we keep (renamed/deleted scenes)
			for (const [groupId, sceneMap] of Object.entries(this._sceneMap)) {
				const expectedScenes = new Set(Object.keys(sceneMap).map(name => name.replace(/[^a-zA-Z0-9_]/g, '_')));
				const existing = await this.getStatesOfAsync(`groups.${groupId}`, 'scenes').catch(() => []);
				for (const st of existing || []) {
					const safeKey = st._id.split('.').pop();
					if (!expectedScenes.has(safeKey)) {
						this.log.info(`Removing stale scene state "${st._id}"`);
						await this.delObjectAsync(st._id.slice(this.namespace.length + 1));
					}
				}
			}
		} catch (err) {
			this.log.error(`Object tree reconciliation failed: ${err.message}`);
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
		await this.setObjectNotExistsAsync(`lights.${id}.info`, lightInfoChannel(id));
		await this.setObjectNotExistsAsync(`lights.${id}.state`, lightStateChannel(id));
		for (const def of LIGHT_STATES) {
			await this.setObjectNotExistsAsync(`lights.${id}.${def.sub}`, buildStateObj(`lights.${id}`, def));
		}
		this.log.debug(`Objects for light ${id} ready`);
	}

	/**
	 * Create all ioBroker objects for a smart plug/switch.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _createPlugObjects(id, light) {
		this.log.debug(`Creating/updating objects for plug ${id} ("${light.name}")`);
		await this.extendObjectAsync(`plugs.${id}`, plugDevice(id, light.name));
		await this.setObjectNotExistsAsync(`plugs.${id}.info`, plugInfoChannel(id));
		await this.setObjectNotExistsAsync(`plugs.${id}.state`, plugStateChannel(id));
		for (const def of PLUG_STATES) {
			await this.setObjectNotExistsAsync(`plugs.${id}.${def.sub}`, buildStateObj(`plugs.${id}`, def));
		}
		this.log.debug(`Objects for plug ${id} ready`);
	}

	/**
	 * Create all ioBroker objects for a window covering motor.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _createCoverObjects(id, light) {
		this.log.debug(`Creating/updating objects for cover ${id} ("${light.name}")`);
		await this.extendObjectAsync(`covers.${id}`, coverDevice(id, light.name));
		await this.setObjectNotExistsAsync(`covers.${id}.info`, coverInfoChannel(id));
		await this.setObjectNotExistsAsync(`covers.${id}.state`, coverStateChannel(id));
		for (const def of COVER_STATES) {
			await this.setObjectNotExistsAsync(`covers.${id}.${def.sub}`, buildStateObj(`covers.${id}`, def));
		}
		this.log.debug(`Objects for cover ${id} ready`);
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
		await this.setObjectNotExistsAsync(`groups.${id}.info`, groupInfoChannel(id));
		await this.setObjectNotExistsAsync(`groups.${id}.action`, groupActionChannel(id));
		await this.setObjectNotExistsAsync(`groups.${id}.scenes`, groupScenesChannel(id));
		for (const def of GROUP_INFO_STATES) {
			await this.setObjectNotExistsAsync(`groups.${id}.${def.sub}`, buildStateObj(`groups.${id}`, def));
		}
		for (const def of GROUP_ACTION_STATES) {
			await this.setObjectNotExistsAsync(`groups.${id}.${def.sub}`, buildStateObj(`groups.${id}`, def));
		}
		const sceneMap = this._sceneMap[id] || {};
		for (const sceneName of Object.keys(sceneMap)) {
			const safeKey = sceneName.replace(/[^a-zA-Z0-9_]/g, '_');
			this.log.debug(`  Creating scene state: groups.${id}.scenes.${safeKey} ("${sceneName}")`);
			await this.setObjectNotExistsAsync(`groups.${id}.scenes.${safeKey}`, {
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
			await this.setObjectNotExistsAsync(`remotes.${id}.${sub}`, remoteChannel(id, sub, name));
		}
		for (const def of [
			...REMOTE_INFO_STATES,
			...REMOTE_BUTTON_STATES,
			...REMOTE_COLORWHEEL_STATES,
			...REMOTE_COLORTEMP_STATES,
		]) {
			await this.setObjectNotExistsAsync(`remotes.${id}.${def.sub}`, buildStateObj(`remotes.${id}`, def));
		}
		this.log.debug(`Objects for remote ${id} ready`);
	}

	/**
	 * Create all ioBroker objects for a generic (non-Tint) Zigbee switch.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _createSwitchObjects(id, sensor) {
		this.log.debug(`Creating/updating objects for switch ${id} ("${sensor.name}")`);
		await this.extendObjectAsync(`switches.${id}`, switchDevice(id, sensor.name));
		await this.setObjectNotExistsAsync(`switches.${id}.info`, switchChannel(id, 'info', 'Info'));
		await this.setObjectNotExistsAsync(`switches.${id}.button`, switchChannel(id, 'button', 'Button'));
		for (const def of [...SWITCH_INFO_STATES, ...SWITCH_BUTTON_STATES]) {
			await this.setObjectNotExistsAsync(`switches.${id}.${def.sub}`, buildStateObj(`switches.${id}`, def));
		}
		this.log.debug(`Objects for switch ${id} ready`);
	}

	/**
	 * Create all ioBroker objects for a generic sensor. Only the value
	 * state(s) relevant to this sensor's deCONZ "type" get created — unknown
	 * types fall back to a single generic raw-value state.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _createSensorObjects(id, sensor) {
		this.log.debug(`Creating/updating objects for sensor ${id} ("${sensor.name}")`);
		await this.extendObjectAsync(`sensors.${id}`, sensorDevice(id, sensor.name));
		await this.setObjectNotExistsAsync(`sensors.${id}.info`, sensorChannel(id, 'info', 'Info'));
		await this.setObjectNotExistsAsync(`sensors.${id}.value`, sensorChannel(id, 'value', 'Value'));
		const valueStates = SENSOR_VALUE_STATES[sensor.type] || [SENSOR_GENERIC_VALUE_STATE];
		for (const def of [...SENSOR_INFO_STATES, ...valueStates]) {
			await this.setObjectNotExistsAsync(`sensors.${id}.${def.sub}`, buildStateObj(`sensors.${id}`, def));
		}
		this.log.debug(`Objects for sensor ${id} ready (type=${sensor.type})`);
	}

	/**
	 * Create all ioBroker objects for a thermostat.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _createThermostatObjects(id, sensor) {
		this.log.debug(`Creating/updating objects for thermostat ${id} ("${sensor.name}")`);
		await this.extendObjectAsync(`thermostats.${id}`, thermostatDevice(id, sensor.name));
		await this.setObjectNotExistsAsync(`thermostats.${id}.info`, thermostatInfoChannel(id));
		await this.setObjectNotExistsAsync(`thermostats.${id}.state`, thermostatStateChannel(id));
		for (const def of THERMOSTAT_STATES) {
			await this.setObjectNotExistsAsync(`thermostats.${id}.${def.sub}`, buildStateObj(`thermostats.${id}`, def));
		}
		this.log.debug(`Objects for thermostat ${id} ready`);
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
	 * Sync states of a single smart plug/switch from its deCONZ object.
	 * Plugs only get info.* and state.on — no brightness/color support.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _updatePlugStates(id, light) {
		const s = light.state || {};
		const p = `plugs.${id}`;

		this.log.debug(`Syncing plug ${id} ("${light.name}"): on=${s.on}, reachable=${s.reachable}`);

		await this._set(`${p}.info.name`, light.name);
		await this._set(`${p}.info.modelid`, light.modelid || '');
		await this._set(`${p}.info.manufacturer`, light.manufacturername || '');
		await this._set(`${p}.info.reachable`, s.reachable ?? false);
		await this._set(`${p}.info.uniqueid`, light.uniqueid || '');
		await this._set(`${p}.state.on`, s.on ?? false);
	}

	/**
	 * Sync states of a single window covering from its deCONZ object.
	 * deCONZ's "lift" is the percentage CLOSED (0=open, 100=closed); ioBroker's
	 * level.blind role is the opposite (0=closed, 100=open), hence 100-lift.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} light - deCONZ light object
	 */
	async _updateCoverStates(id, light) {
		const s = light.state || {};
		const p = `covers.${id}`;
		const position = s.lift !== undefined ? 100 - s.lift : s.open ? 100 : 0;

		this.log.debug(`Syncing cover ${id} ("${light.name}"): lift=${s.lift}, open=${s.open}, position=${position}`);

		await this._set(`${p}.info.name`, light.name);
		await this._set(`${p}.info.modelid`, light.modelid || '');
		await this._set(`${p}.info.manufacturer`, light.manufacturername || '');
		await this._set(`${p}.info.reachable`, s.reachable ?? false);
		await this._set(`${p}.info.uniqueid`, light.uniqueid || '');
		await this._set(`${p}.state.position`, position);
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

	/**
	 * Sync info states of a generic (non-Tint) Zigbee switch.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _updateSwitchInfo(id, sensor) {
		const p = `switches.${id}`;

		this.log.debug(
			`Syncing switch ${id} ("${sensor.name}"): ` +
				`reachable=${sensor.config?.reachable}, buttonevent=${sensor.state?.buttonevent}`,
		);

		await this._set(`${p}.info.name`, sensor.name);
		await this._set(`${p}.info.reachable`, sensor.config?.reachable ?? false);
		if (sensor.config?.battery !== undefined) {
			await this._set(`${p}.info.battery`, sensor.config.battery);
		}
		if (sensor.lastseen) {
			await this._set(`${p}.info.lastSeen`, sensor.lastseen);
		}
		if (sensor.state?.buttonevent !== undefined) {
			await this._set(`${p}.button.lastEvent`, sensor.state.buttonevent);
		}
	}

	/**
	 * Sync states of a generic sensor from its deCONZ object. Only the
	 * value(s) relevant to its type are written — see SENSOR_VALUE_STATES in
	 * lib/objects.js for the type → state mapping and the scaling notes
	 * there (deCONZ reports temperature/humidity in hundredths, etc.).
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _updateSensorStates(id, sensor) {
		const s = sensor.state || {};
		const p = `sensors.${id}`;

		this.log.debug(`Syncing sensor ${id} ("${sensor.name}"): type=${sensor.type}, state=${JSON.stringify(s)}`);

		await this._set(`${p}.info.name`, sensor.name);
		await this._set(`${p}.info.reachable`, sensor.config?.reachable ?? false);
		if (sensor.config?.battery !== undefined) {
			await this._set(`${p}.info.battery`, sensor.config.battery);
		}
		if (sensor.lastseen) {
			await this._set(`${p}.info.lastSeen`, sensor.lastseen);
		}

		switch (sensor.type) {
			case 'ZHATemperature':
				if (s.temperature !== undefined) {
					await this._set(`${p}.value.temperature`, s.temperature / 100);
				}
				break;
			case 'ZHAHumidity':
				if (s.humidity !== undefined) {
					await this._set(`${p}.value.humidity`, s.humidity / 100);
				}
				break;
			case 'ZHAPressure':
				if (s.pressure !== undefined) {
					await this._set(`${p}.value.pressure`, s.pressure);
				}
				break;
			case 'ZHAOpenClose':
				if (s.open !== undefined) {
					await this._set(`${p}.value.open`, s.open);
				}
				break;
			case 'ZHAPresence':
				if (s.presence !== undefined) {
					await this._set(`${p}.value.presence`, s.presence);
				}
				break;
			case 'ZHALightLevel': {
				let lux = s.lux;
				if (lux === undefined && s.lightlevel !== undefined) {
					lux = Math.round(Math.pow(10, (s.lightlevel - 1) / 10000));
				}
				if (lux !== undefined) {
					await this._set(`${p}.value.brightness`, lux);
				}
				break;
			}
			case 'ZHAPower':
				if (s.power !== undefined) {
					await this._set(`${p}.value.power`, s.power);
				}
				break;
			case 'ZHAConsumption':
				if (s.consumption !== undefined) {
					await this._set(`${p}.value.consumption`, s.consumption / 1000);
				}
				break;
			default:
				await this._set(`${p}.value.raw`, JSON.stringify(s));
		}
	}

	/**
	 * Sync states of a single thermostat from its deCONZ object. deCONZ
	 * reports temperature/heatsetpoint in hundredths of a degree Celsius.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _updateThermostatStates(id, sensor) {
		const s = sensor.state || {};
		const c = sensor.config || {};
		const p = `thermostats.${id}`;

		this.log.debug(
			`Syncing thermostat ${id} ("${sensor.name}"): ` +
				`temperature=${s.temperature}, valve=${s.valve}, heatsetpoint=${c.heatsetpoint}`,
		);

		await this._set(`${p}.info.name`, sensor.name);
		await this._set(`${p}.info.reachable`, c.reachable ?? false);
		if (c.battery !== undefined) {
			await this._set(`${p}.info.battery`, c.battery);
		}
		if (s.temperature !== undefined) {
			await this._set(`${p}.state.temperature`, s.temperature / 100);
		}
		if (s.valve !== undefined) {
			await this._set(`${p}.state.valve`, s.valve);
		}
		if (c.heatsetpoint !== undefined) {
			await this._set(`${p}.state.setpoint`, c.heatsetpoint / 100);
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
				if (this._plugMap[id]) {
					this.log.debug(`WS plug ${id} state changed: ${JSON.stringify(state)}`);
					await this._applyPlugStateUpdate(id, state);
				} else if (this._coverMap[id]) {
					this.log.debug(`WS cover ${id} state changed: ${JSON.stringify(state)}`);
					await this._applyCoverStateUpdate(id, state);
				} else {
					this.log.debug(`WS light ${id} state changed: ${JSON.stringify(state)}`);
					await this._applyLightStateUpdate(id, state);
				}
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
			} else if (r === 'sensors') {
				if (this._remoteMap[id] && state && state.buttonevent !== undefined) {
					this.log.debug(`WS remote ${id} button event: ${state.buttonevent} — dispatching to RemoteHandler`);
					await this._remote.handleEvent(id, state, config, attr);
				} else if (this._switchMap[id] && state && state.buttonevent !== undefined) {
					this.log.debug(`WS switch ${id} button event: ${state.buttonevent}`);
					await this._set(`switches.${id}.button.lastEvent`, state.buttonevent);
				} else if (this._thermostatMap[id] && (state || config)) {
					this.log.debug(
						`WS thermostat ${id} changed: state=${JSON.stringify(state)} config=${JSON.stringify(config)}`,
					);
					if (state?.temperature !== undefined) {
						await this._set(`thermostats.${id}.state.temperature`, state.temperature / 100);
					}
					if (state?.valve !== undefined) {
						await this._set(`thermostats.${id}.state.valve`, state.valve);
					}
					if (config?.heatsetpoint !== undefined) {
						await this._set(`thermostats.${id}.state.setpoint`, config.heatsetpoint / 100);
					}
				} else if (this._sensorMap[id] && state) {
					this.log.debug(`WS sensor ${id} state changed: ${JSON.stringify(state)}`);
					await this._applySensorStateUpdate(id, state);
				} else {
					this.log.debug(`WS sensor ${id} changed event has no relevant payload — skipping`);
				}
			} else {
				this.log.debug(`WS changed event for r="${r}" id="${id}" has no relevant payload — skipping`);
			}
		} else if (e === 'added') {
			this.log.info(`WS: new ${r} (id=${id}) detected — scheduling full re-discovery`);
			this._scheduleRediscover();
		} else if (e === 'deleted') {
			this.log.info(`WS: ${r} id=${id} was removed from deCONZ — scheduling re-discovery to update object tree`);
			this._scheduleRediscover();
		} else {
			this.log.debug(`WS event type "${e}" for r="${r}" id="${id}" — no handler, ignoring`);
		}
	}

	/**
	 * Debounce repeated added/deleted WS events into a single _discoverAll()
	 * call. deCONZ can emit several such events in quick succession (e.g.
	 * after a brief network hiccup causes it to re-announce multiple
	 * devices) — without debouncing, each one would trigger its own full
	 * discovery pass back-to-back, multiplying the object-tree write load
	 * for no benefit (one discovery after the dust settles covers all of
	 * them).
	 */
	_scheduleRediscover() {
		if (this._stopped) {
			this.log.debug('_scheduleRediscover called after stop — ignoring');
			return;
		}
		if (this._rediscoverTimer) {
			this.log.debug('Re-discovery already scheduled — coalescing this trigger into it');
			return;
		}
		this._rediscoverTimer = this.setTimeout(() => {
			this._rediscoverTimer = null;
			this._discoverAll().catch(err => this.log.error(`Scheduled re-discovery failed: ${err.message}`));
		}, 2000);
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
	 * Apply a partial plug state update received via WebSocket.
	 * Plugs only get state.on and info.reachable — no brightness/color support.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} s - Partial state object
	 */
	async _applyPlugStateUpdate(id, s) {
		if (!this._plugMap[id]) {
			this.log.debug(`WS: plug ${id} not in plugMap — skipping state update`);
			return;
		}
		const name = this._plugMap[id];
		const p = `plugs.${id}`;
		this.log.debug(`Applying WS state update for plug ${id} ("${name}"): ${JSON.stringify(s)}`);

		if (s.on !== undefined) {
			await this._set(`${p}.state.on`, s.on);
		}
		if (s.reachable !== undefined) {
			this.log.debug(`Plug ${id} ("${name}") reachability changed: ${s.reachable}`);
			await this._set(`${p}.info.reachable`, s.reachable);
		}
	}

	/**
	 * Apply a partial cover state update received via WebSocket.
	 *
	 * @param {string} id - deCONZ light id
	 * @param {object} s - Partial state object
	 */
	async _applyCoverStateUpdate(id, s) {
		if (!this._coverMap[id]) {
			this.log.debug(`WS: cover ${id} not in coverMap — skipping state update`);
			return;
		}
		const name = this._coverMap[id];
		const p = `covers.${id}`;
		this.log.debug(`Applying WS state update for cover ${id} ("${name}"): ${JSON.stringify(s)}`);

		if (s.lift !== undefined) {
			await this._set(`${p}.state.position`, 100 - s.lift);
		} else if (s.open !== undefined) {
			await this._set(`${p}.state.position`, s.open ? 100 : 0);
		}
		if (s.reachable !== undefined) {
			await this._set(`${p}.info.reachable`, s.reachable);
		}
	}

	/**
	 * Apply a partial sensor state update received via WebSocket. Field
	 * names already uniquely identify the metric, so no need to know the
	 * sensor's deCONZ "type" here — see lib/objects.js#SENSOR_VALUE_STATES
	 * for the same field→state mapping used at discovery time.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} s - Partial state object
	 */
	async _applySensorStateUpdate(id, s) {
		const p = `sensors.${id}`;
		if (s.temperature !== undefined) {
			await this._set(`${p}.value.temperature`, s.temperature / 100);
		}
		if (s.humidity !== undefined) {
			await this._set(`${p}.value.humidity`, s.humidity / 100);
		}
		if (s.pressure !== undefined) {
			await this._set(`${p}.value.pressure`, s.pressure);
		}
		if (s.open !== undefined) {
			await this._set(`${p}.value.open`, s.open);
		}
		if (s.presence !== undefined) {
			await this._set(`${p}.value.presence`, s.presence);
		}
		if (s.power !== undefined) {
			await this._set(`${p}.value.power`, s.power);
		}
		if (s.consumption !== undefined) {
			await this._set(`${p}.value.consumption`, s.consumption / 1000);
		}
		if (s.lux !== undefined) {
			await this._set(`${p}.value.brightness`, s.lux);
		} else if (s.lightlevel !== undefined) {
			await this._set(`${p}.value.brightness`, Math.round(Math.pow(10, (s.lightlevel - 1) / 10000)));
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
						// admin's sendTo button only writes values back into the config form
						// when the response carries them under `native` and the jsonConfig
						// item has `useNative: true` — a bare top-level key is ignored.
						respond({ native: { apiKey } });
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
					this.setTimeout(tryPair, POLL_MS);
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
				case 'getLights': {
					const lights = await this._api.getLights();
					const trimmed = {};
					for (const [id, light] of Object.entries(lights)) {
						trimmed[id] = trimLightForAdmin(light);
					}
					this.log.debug(`Admin: returning light list (${Object.keys(trimmed).length} light(s), trimmed)`);
					respond({ lights: trimmed });
					break;
				}

				case 'getGroups': {
					const groups = await this._api.getGroups();
					const trimmed = {};
					for (const [id, group] of Object.entries(groups)) {
						trimmed[id] = trimGroupForAdmin(group);
					}
					this.log.debug(`Admin: returning group list (${Object.keys(trimmed).length} group(s), trimmed)`);
					respond({ groups: trimmed });
					break;
				}

				case 'getSensors':
					this.log.debug('Admin: returning sensor list');
					respond({ sensors: await this._api.getSensors() });
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

				case 'activateScene': {
					const { groupId, sceneId, sceneName } = obj.message || {};
					if (!groupId || sceneId === undefined || !sceneName) {
						respond({ error: 'groupId, sceneId and sceneName are required' });
						break;
					}
					this.log.info(
						`Admin: activate scene command — group=${groupId}, scene="${sceneName}" (id=${sceneId})`,
					);
					await this._recallScene(groupId, sceneId, sceneName);
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
			if ((resource === 'lights' || resource === 'plugs') && channel === 'state') {
				await this._handleLightCommand(deconzId, stateName, state.val);
			} else if (resource === 'covers' && channel === 'state') {
				await this._handleCoverCommand(deconzId, stateName, state.val);
			} else if (resource === 'thermostats' && channel === 'state') {
				await this._handleThermostatCommand(deconzId, stateName, state.val);
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
		const name = this._lightMap[lightId] || this._plugMap[lightId] || `id=${lightId}`;
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
	 * Send a command to a window covering. Covers are technically /lights
	 * entries in deCONZ, so this reuses setLightState — only the ioBroker
	 * state names and the lift/position conversion differ from real lights.
	 *
	 * @param {string} coverId - deCONZ light id
	 * @param {string} stateName - State name e.g. "position", "stop"
	 * @param {unknown} val - New value
	 */
	async _handleCoverCommand(coverId, stateName, val) {
		const name = this._coverMap[coverId] || `id=${coverId}`;
		let body = {};

		switch (stateName) {
			case 'position': {
				const lift = 100 - Number(val);
				body = { lift };
				this.log.info(`Cover ${coverId} ("${name}"): position → ${val}% (lift=${lift})`);
				break;
			}
			case 'stop':
				if (!val) {
					this.log.debug(`Cover ${coverId} ("${name}"): stop set to false — no action`);
					return;
				}
				body = { stop: true };
				this.log.info(`Cover ${coverId} ("${name}"): stop`);
				break;
			default:
				this.log.warn(`Cover ${coverId} ("${name}"): unknown state "${stateName}" — no API call made`);
				return;
		}

		this.log.debug(`Cover ${coverId} ("${name}"): PUT /lights/${coverId}/state ${JSON.stringify(body)}`);
		await this._api.setLightState(coverId, body);
	}

	/**
	 * Send a command to a thermostat. deCONZ exposes the heating setpoint via
	 * config, not state — see DeconzApi.setSensorConfig().
	 *
	 * @param {string} thermostatId - deCONZ sensor id
	 * @param {string} stateName - State name e.g. "setpoint"
	 * @param {unknown} val - New value
	 */
	async _handleThermostatCommand(thermostatId, stateName, val) {
		const name = this._thermostatMap[thermostatId] || `id=${thermostatId}`;

		if (stateName !== 'setpoint') {
			this.log.warn(`Thermostat ${thermostatId} ("${name}"): unknown state "${stateName}" — no API call made`);
			return;
		}
		const heatsetpoint = Math.round(Math.max(5, Math.min(32, Number(val))) * 100);
		this.log.info(`Thermostat ${thermostatId} ("${name}"): setpoint → ${val}°C (heatsetpoint=${heatsetpoint})`);
		await this._api.setSensorConfig(thermostatId, { heatsetpoint });
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
		await this._recallScene(groupId, sceneId, sceneName);
	}

	/**
	 * Recall a scene on deCONZ and sync the boolean scene states of the group
	 * so exactly the recalled scene's state reads true.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {number} sceneId - deCONZ scene id
	 * @param {string} sceneName - Scene name (key in this._sceneMap[groupId])
	 */
	async _recallScene(groupId, sceneId, sceneName) {
		await this._api.recallScene(groupId, sceneId);
		const groupName = this._groupMap[groupId]?.name || `id=${groupId}`;
		this.log.info(`Group ${groupId} ("${groupName}"): recalled scene "${sceneName}" (id=${sceneId})`);
		const sceneMap = this._sceneMap[groupId] || {};
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
		const plugCount = Object.keys(this._plugMap).length;
		const coverCount = Object.keys(this._coverMap).length;
		const groupCount = Object.keys(this._groupMap).length;
		const sensorCount = Object.keys(this._sensorMap).length;
		const thermostatCount = Object.keys(this._thermostatMap).length;
		this.log.debug(
			`Fallback poll starting — ${lightCount} light(s), ${plugCount} plug(s), ${coverCount} cover(s), ` +
				`${groupCount} group(s), ${sensorCount} sensor(s), ${thermostatCount} thermostat(s)`,
		);
		try {
			const lights = await this._api.getLights();
			let lightUpdated = 0;
			let plugUpdated = 0;
			let coverUpdated = 0;
			for (const [id, light] of Object.entries(lights)) {
				if (this._lightMap[id]) {
					await this._updateLightStates(id, light);
					lightUpdated++;
				} else if (this._plugMap[id]) {
					await this._updatePlugStates(id, light);
					plugUpdated++;
				} else if (this._coverMap[id]) {
					await this._updateCoverStates(id, light);
					coverUpdated++;
				} else {
					this.log.debug(
						`Poll: light ${id} not in lightMap/plugMap/coverMap — skipping (run discovery first)`,
					);
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
			const sensors = await this._api.getSensors();
			let sensorUpdated = 0;
			let thermostatUpdated = 0;
			for (const [id, sensor] of Object.entries(sensors)) {
				if (this._sensorMap[id]) {
					await this._updateSensorStates(id, sensor);
					sensorUpdated++;
				} else if (this._thermostatMap[id]) {
					await this._updateThermostatStates(id, sensor);
					thermostatUpdated++;
				}
			}
			this.log.debug(
				`Fallback poll complete — updated ${lightUpdated} light(s), ${plugUpdated} plug(s), ` +
					`${coverUpdated} cover(s), ${groupUpdated} group(s), ${sensorUpdated} sensor(s), ` +
					`${thermostatUpdated} thermostat(s)`,
			);
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
