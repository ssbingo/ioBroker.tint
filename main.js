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

		const { ip, port, wsPort, apiKey } = this.config;

		if (!ip || !apiKey) {
			this.log.error('IP or API key not configured – please check adapter settings');
			return;
		}

		this._api = new DeconzApi({
			ip,
			port: port || 80,
			apiKey,
			log: this.log,
		});

		const ok = await this._api.testConnection();
		if (!ok) {
			this.log.error(`Cannot connect to deCONZ at ${ip}:${port} – check IP/key`);
			return;
		}
		this.setState('info.connection', true, true);
		this.log.info(`Connected to deCONZ at ${ip}:${port}`);

		this._remote = new RemoteHandler(this, this._onColorWheelEvent.bind(this));

		await this._discoverAll();

		this._ws = new DeconzWebSocket({
			ip,
			wsPort: wsPort || 443,
			log: this.log,
			onEvent: this._onWsEvent.bind(this),
			onOpen: () => this.setState('info.connection', true, true),
			onClose: () => this.setState('info.connection', false, true),
		});
		this._ws.connect();

		await this.subscribeStatesAsync('lights.*.state.*');
		await this.subscribeStatesAsync('groups.*.action.*');
		await this.subscribeStatesAsync('groups.*.scenes.*');

		this._schedulePoll();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param {() => void} callback - Callback function
	 */
	onUnload(callback) {
		try {
			this._stopped = true;
			if (this._remote) {
				this._remote.stop();
			}
			if (this._ws) {
				this._ws.close();
			}
			if (this._pollTimer) {
				this.clearTimeout(this._pollTimer);
				this._pollTimer = null;
			}
			this.setState('info.connection', false, true);
			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${error.message}`);
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
		await this._discoverLights();
		await this._discoverGroups();
		await this._discoverRemotes();
	}

	/**
	 * Discover all lights and create their state objects.
	 */
	async _discoverLights() {
		try {
			const lights = await this._api.getLights();
			for (const [id, light] of Object.entries(lights)) {
				this._lightMap[id] = light.name;
				await this._createLightObjects(id, light);
				await this._updateLightStates(id, light);
			}
			this.log.info(`Discovered ${Object.keys(lights).length} light(s)`);
		} catch (err) {
			this.log.error(`Light discovery failed: ${err.message}`);
		}
	}

	/**
	 * Discover all groups including their scenes and create state objects.
	 */
	async _discoverGroups() {
		try {
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
				await this._createGroupObjects(id, group);
				await this._updateGroupStates(id, group);
			}
			this.log.info(`Discovered ${Object.keys(groups).length} group(s)`);
		} catch (err) {
			this.log.error(`Group discovery failed: ${err.message}`);
		}
	}

	/**
	 * Discover all sensors (remotes) and create state objects.
	 */
	async _discoverRemotes() {
		try {
			const sensors = await this._api.getSensors();
			for (const [id, sensor] of Object.entries(sensors)) {
				if (!sensor.type || !sensor.type.includes('Switch')) {
					continue;
				}
				this._remoteMap[id] = sensor.name;
				await this._createRemoteObjects(id, sensor);
				await this._updateRemoteInfo(id, sensor);
			}
			this.log.info(`Discovered ${Object.keys(this._remoteMap).length} remote(s)`);
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
		await this.extendObjectAsync(`lights.${id}`, lightDevice(id, light.name));
		await this.extendObjectAsync(`lights.${id}.info`, lightInfoChannel(id));
		await this.extendObjectAsync(`lights.${id}.state`, lightStateChannel(id));
		for (const def of LIGHT_STATES) {
			await this.extendObjectAsync(`lights.${id}.${def.sub}`, buildStateObj(`lights.${id}`, def));
		}
	}

	/**
	 * Create all ioBroker objects for a group including scene boolean states.
	 *
	 * @param {string} id - deCONZ group id
	 * @param {object} group - deCONZ group object
	 */
	async _createGroupObjects(id, group) {
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
	}

	/**
	 * Create all ioBroker objects for a remote sensor.
	 *
	 * @param {string} id - deCONZ sensor id
	 * @param {object} sensor - deCONZ sensor object
	 */
	async _createRemoteObjects(id, sensor) {
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
			return;
		}
		const { e, r, id, state, action, config, attr } = event;

		if (e === 'changed') {
			if (r === 'lights' && state) {
				await this._applyLightStateUpdate(id, state);
			} else if (r === 'groups') {
				if (state) {
					await this._applyGroupStateUpdate(id, state);
				}
				if (action) {
					await this._applyGroupActionUpdate(id, action);
				}
			} else if (r === 'sensors' && state && state.buttonevent !== undefined) {
				await this._remote.handleEvent(id, state, config, attr);
			}
		} else if (e === 'added') {
			this.log.info(`deCONZ: new ${r} ${id} detected – re-discovering`);
			await this._discoverAll();
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
			return;
		}
		const p = `lights.${id}`;
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
			return;
		}
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
			return;
		}
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
		if (!obj || !obj.command) return;

		const respond = (result) => {
			if (obj.callback) this.sendTo(obj.from, obj.command, result, obj.callback);
		};

		// pair does not require an existing connection — it IS how the connection is bootstrapped
		if (obj.command === 'pair') {
			const ip = obj.message?.ip || this.config.ip;
			const port = Number(obj.message?.port) || this.config.port;
			if (!ip) {
				respond({ error: 'IP address is required. Please enter the deCONZ IP address first.' });
				return;
			}
			try {
				const apiKey = await DeconzApi.pair(ip, port);
				this.log.info(`deCONZ pairing successful. API key received.`);
				respond({ apiKey });
			} catch (err) {
				this.log.warn(`deCONZ pairing failed: ${err.message}`);
				respond({ error: err.message });
			}
			return;
		}

		if (!this._api) {
			respond({ error: 'Adapter not connected to deCONZ' });
			return;
		}

		try {
			switch (obj.command) {
				case 'getLights':
					respond({ lights: await this._api.getLights() });
					break;

				case 'getGroups':
					respond({ groups: await this._api.getGroups() });
					break;

				case 'createGroup': {
					const res = await this._api.createGroup(obj.message.name, obj.message.lights || []);
					await this._discoverGroups();
					respond({ ok: true, result: res });
					break;
				}

				case 'updateGroup': {
					await this._api.updateGroup(obj.message.id, obj.message.name, obj.message.lights || []);
					await this._discoverGroups();
					respond({ ok: true });
					break;
				}

				case 'deleteGroup': {
					await this._api.deleteGroup(obj.message.id);
					await this._discoverGroups();
					respond({ ok: true });
					break;
				}

				default:
					respond({ error: `Unknown command: ${obj.command}` });
			}
		} catch (err) {
			this.log.error(`onMessage ${obj.command} failed: ${err.message}`);
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
			return;
		}

		// tint.0.lights.3.state.on  → parts[2]=lights, [3]=id, [4]=channel, [5]=name
		const parts = id.split('.');
		const resource = parts[2];
		const deconzId = parts[3];
		const channel = parts[4];
		const stateName = parts[5];

		try {
			if (resource === 'lights' && channel === 'state') {
				await this._handleLightCommand(deconzId, stateName, state.val);
			} else if (resource === 'groups') {
				if (channel === 'action') {
					await this._handleGroupCommand(deconzId, stateName, state.val);
				} else if (channel === 'scenes') {
					await this._handleSceneCommand(deconzId, stateName, state.val, id);
				}
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
		let body = {};

		switch (stateName) {
			case 'on':
				body = { on: Boolean(val) };
				break;
			case 'brightness':
				body = { on: true, bri: percentToBri(Number(val)), transitiontime: transitionTime };
				break;
			case 'colorTemp':
				body = { ct: kelvinToMired(Number(val)), transitiontime: transitionTime };
				break;
			case 'hue':
				body = { hue: Number(val), transitiontime: transitionTime };
				break;
			case 'saturation':
				body = { sat: Number(val), transitiontime: transitionTime };
				break;
			case 'hex': {
				const [x, y] = hexToXy(String(val));
				body = { xy: [x, y], transitiontime: transitionTime };
				break;
			}
			case 'x':
			case 'y': {
				const xState = await this.getStateAsync(`lights.${lightId}.state.x`);
				const yState = await this.getStateAsync(`lights.${lightId}.state.y`);
				const xVal = stateName === 'x' ? Number(val) : (xState?.val ?? 0);
				const yVal = stateName === 'y' ? Number(val) : (yState?.val ?? 0);
				body = { xy: [xVal, yVal], transitiontime: transitionTime };
				break;
			}
			case 'effect':
				body = { effect: String(val) };
				break;
			case 'effectSpeed':
				body = { colorspeed: Number(val) };
				break;
			default:
				this.log.debug(`Unknown light state: ${stateName}`);
				return;
		}

		await this._api.setLightState(lightId, body);
		this.log.debug(`Light ${lightId} ← ${JSON.stringify(body)}`);
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
		let body = {};

		switch (stateName) {
			case 'on':
				body = { on: Boolean(val) };
				break;
			case 'brightness':
				body = { on: true, bri: percentToBri(Number(val)), transitiontime: transitionTime };
				break;
			case 'colorTemp':
				body = { ct: kelvinToMired(Number(val)), transitiontime: transitionTime };
				break;
			case 'hex': {
				const [x, y] = hexToXy(String(val));
				body = { xy: [x, y], transitiontime: transitionTime };
				break;
			}
			case 'effect':
				body = { effect: String(val) };
				break;
			case 'activateScene': {
				const sceneMap = this._sceneMap[groupId] || {};
				const sceneId = sceneMap[String(val)];
				if (sceneId === undefined) {
					this.log.warn(`Scene "${val}" not found in group ${groupId}`);
					return;
				}
				await this._api.recallScene(groupId, sceneId);
				this.log.info(`Group ${groupId}: recalled scene "${val}"`);
				return;
			}
			default:
				this.log.debug(`Unknown group action: ${stateName}`);
				return;
		}

		await this._api.setGroupAction(groupId, body);
		this.log.debug(`Group ${groupId} ← ${JSON.stringify(body)}`);
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
			return;
		}
		const obj = await this.getObjectAsync(fullId);
		const sceneName = obj?.native?.sceneName || safeSceneName;
		const sceneMap = this._sceneMap[groupId] || {};
		const sceneId = sceneMap[sceneName];
		if (sceneId === undefined) {
			this.log.warn(`Scene "${sceneName}" not found in group ${groupId}`);
			return;
		}
		await this._api.recallScene(groupId, sceneId);
		this.log.info(`Group ${groupId}: recalled scene "${sceneName}"`);
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
			return;
		}

		const zoneState = await this.getStateAsync(`remotes.${sensorId}.button.activeZone`);
		const zone = zoneState?.val ?? 0;
		const ZONE_GROUPS = { 1: '16388', 2: '16389', 3: '16390' };

		if (zone === 0) {
			for (const lightId of Object.keys(this._lightMap)) {
				await this._api
					.setLightState(lightId, {
						xy: [x, y],
						on: true,
						transitiontime: this.config.transitionTime ?? 4,
					})
					.catch(() => {});
			}
		} else {
			const groupNum = ZONE_GROUPS[zone];
			for (const [groupId] of Object.entries(this._groupMap)) {
				if (groupNum && groupId === groupNum) {
					await this._api
						.setGroupAction(groupId, {
							xy: [x, y],
							on: true,
							transitiontime: this.config.transitionTime ?? 4,
						})
						.catch(() => {});
					break;
				}
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
			return;
		}
		const interval = (this.config.pollingInterval || 60) * 1000;
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
		try {
			const lights = await this._api.getLights();
			for (const [id, light] of Object.entries(lights)) {
				if (this._lightMap[id]) {
					await this._updateLightStates(id, light);
				}
			}
			const groups = await this._api.getGroups();
			for (const [id, group] of Object.entries(groups)) {
				if (this._groupMap[id]) {
					await this._updateGroupStates(id, group);
				}
			}
		} catch (err) {
			this.log.warn(`Poll failed: ${err.message}`);
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
