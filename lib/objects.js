'use strict';

/**
 * ioBroker object definitions for ioBroker.tint
 * All roles are taken from the official ioBroker STATE_ROLES list
 */

// ─── Light objects ────────────────────────────────────────────────────────────

/**
 * Build a device object for a light.
 *
 * @param {string} id - deCONZ light id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function lightDevice(id, name) {
	return {
		_id: `lights.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build the info channel object for a light.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function lightInfoChannel(id) {
	return {
		_id: `lights.${id}.info`,
		type: 'channel',
		common: { name: 'Info' },
		native: {},
	};
}

/**
 * Build the state channel object for a light.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function lightStateChannel(id) {
	return {
		_id: `lights.${id}.state`,
		type: 'channel',
		common: { name: 'State' },
		native: {},
	};
}

const LIGHT_STATES = [
	// info
	{
		sub: 'info.name',
		type: 'string',
		role: 'info.name',
		read: true,
		write: false,
	},
	{
		sub: 'info.modelid',
		type: 'string',
		role: 'info.hardware.serial',
		read: true,
		write: false,
	},
	{
		sub: 'info.manufacturer',
		type: 'string',
		role: 'info.hardware.model',
		read: true,
		write: false,
	},
	{
		sub: 'info.reachable',
		type: 'boolean',
		role: 'indicator.reachable',
		read: true,
		write: false,
	},
	{
		sub: 'info.uniqueid',
		type: 'string',
		role: 'info.address.ieee',
		read: true,
		write: false,
	},
	// state – writable
	{
		sub: 'state.on',
		type: 'boolean',
		role: 'switch.light',
		read: true,
		write: true,
	},
	{
		sub: 'state.brightness',
		type: 'number',
		role: 'level.dimmer',
		read: true,
		write: true,
		unit: '%',
		min: 0,
		max: 100,
	},
	{
		sub: 'state.colorTemp',
		type: 'number',
		role: 'level.color.temperature',
		read: true,
		write: true,
		unit: 'K',
		min: 2000,
		max: 6500,
	},
	{
		sub: 'state.hue',
		type: 'number',
		role: 'level.color.hue',
		read: true,
		write: true,
		min: 0,
		max: 65535,
	},
	{
		sub: 'state.saturation',
		type: 'number',
		role: 'level.color.saturation',
		read: true,
		write: true,
		min: 0,
		max: 254,
	},
	{
		sub: 'state.hex',
		type: 'string',
		role: 'level.color.rgb',
		read: true,
		write: true,
	},
	{
		sub: 'state.effect',
		type: 'string',
		role: 'text',
		read: true,
		write: true,
		states: {
			none: 'none',
			colorloop: 'colorloop',
			sunset: 'sunset',
			party: 'party',
			worklight: 'worklight',
			campfire: 'campfire',
			romance: 'romance',
			nightlight: 'nightlight',
		},
	},
	{
		sub: 'state.effectSpeed',
		type: 'number',
		role: 'value',
		read: true,
		write: true,
		min: 0,
		max: 255,
	},
	{
		sub: 'state.colorMode',
		type: 'string',
		role: 'text',
		read: true,
		write: false,
	},
	{
		sub: 'state.transitionTime',
		type: 'number',
		role: 'value',
		read: true,
		write: true,
		def: 4,
		unit: '×100ms',
	},
	// xy (raw, for advanced use)
	{ sub: 'state.x', type: 'number', role: 'value', read: true, write: true },
	{ sub: 'state.y', type: 'number', role: 'value', read: true, write: true },
];

// ─── Plug objects ─────────────────────────────────────────────────────────────

/**
 * Build a device object for a smart plug/switch.
 *
 * @param {string} id - deCONZ light id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function plugDevice(id, name) {
	return {
		_id: `plugs.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build the info channel object for a plug.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function plugInfoChannel(id) {
	return {
		_id: `plugs.${id}.info`,
		type: 'channel',
		common: { name: 'Info' },
		native: {},
	};
}

/**
 * Build the state channel object for a plug.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function plugStateChannel(id) {
	return {
		_id: `plugs.${id}.state`,
		type: 'channel',
		common: { name: 'State' },
		native: {},
	};
}

const PLUG_STATES = [
	// info
	{
		sub: 'info.name',
		type: 'string',
		role: 'info.name',
		read: true,
		write: false,
	},
	{
		sub: 'info.modelid',
		type: 'string',
		role: 'info.hardware.serial',
		read: true,
		write: false,
	},
	{
		sub: 'info.manufacturer',
		type: 'string',
		role: 'info.hardware.model',
		read: true,
		write: false,
	},
	{
		sub: 'info.reachable',
		type: 'boolean',
		role: 'indicator.reachable',
		read: true,
		write: false,
	},
	{
		sub: 'info.uniqueid',
		type: 'string',
		role: 'info.address.ieee',
		read: true,
		write: false,
	},
	// state – writable (no brightness/color: plugs don't support it)
	{
		sub: 'state.on',
		type: 'boolean',
		role: 'switch',
		read: true,
		write: true,
	},
];

// ─── Group objects ────────────────────────────────────────────────────────────

/**
 * Build a device object for a group.
 *
 * @param {string} id - deCONZ group id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function groupDevice(id, name) {
	return {
		_id: `groups.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build the info channel object for a group.
 *
 * @param {string} id - deCONZ group id
 * @returns {object} ioBroker channel object definition
 */
function groupInfoChannel(id) {
	return {
		_id: `groups.${id}.info`,
		type: 'channel',
		common: { name: 'Info' },
		native: {},
	};
}

/**
 * Build the action channel object for a group.
 *
 * @param {string} id - deCONZ group id
 * @returns {object} ioBroker channel object definition
 */
function groupActionChannel(id) {
	return {
		_id: `groups.${id}.action`,
		type: 'channel',
		common: { name: 'Action' },
		native: {},
	};
}

/**
 * Build the scenes channel object for a group.
 *
 * @param {string} id - deCONZ group id
 * @returns {object} ioBroker channel object definition
 */
function groupScenesChannel(id) {
	return {
		_id: `groups.${id}.scenes`,
		type: 'channel',
		common: { name: 'Scenes' },
		native: {},
	};
}

const GROUP_INFO_STATES = [
	{
		sub: 'info.name',
		type: 'string',
		role: 'info.name',
		read: true,
		write: false,
	},
	{
		sub: 'info.memberCount',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
	},
	{
		sub: 'info.allOn',
		type: 'boolean',
		role: 'indicator',
		read: true,
		write: false,
	},
	{
		sub: 'info.anyOn',
		type: 'boolean',
		role: 'indicator',
		read: true,
		write: false,
	},
];

const GROUP_ACTION_STATES = [
	{
		sub: 'action.on',
		type: 'boolean',
		role: 'switch.light',
		read: true,
		write: true,
	},
	{
		sub: 'action.brightness',
		type: 'number',
		role: 'level.dimmer',
		read: true,
		write: true,
		unit: '%',
		min: 0,
		max: 100,
	},
	{
		sub: 'action.colorTemp',
		type: 'number',
		role: 'level.color.temperature',
		read: true,
		write: true,
		unit: 'K',
		min: 2000,
		max: 6500,
	},
	{
		sub: 'action.hex',
		type: 'string',
		role: 'level.color.rgb',
		read: true,
		write: true,
	},
	{
		sub: 'action.effect',
		type: 'string',
		role: 'text',
		read: true,
		write: true,
		states: {
			none: 'none',
			colorloop: 'colorloop',
			sunset: 'sunset',
			party: 'party',
			worklight: 'worklight',
			campfire: 'campfire',
			romance: 'romance',
			nightlight: 'nightlight',
		},
	},
	{
		sub: 'action.transitionTime',
		type: 'number',
		role: 'value',
		read: true,
		write: true,
		def: 4,
		unit: '×100ms',
	},
	{
		sub: 'action.activateScene',
		type: 'string',
		role: 'text',
		read: true,
		write: true,
	},
];

// ─── Remote (Sensor) objects ──────────────────────────────────────────────────

/**
 * Build a device object for a remote sensor.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function remoteDevice(id, name) {
	return {
		_id: `remotes.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build a channel object for a remote sensor sub-channel.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} sub - Channel name e.g. "info", "button"
 * @param {string} name - Display name
 * @returns {object} ioBroker channel object definition
 */
function remoteChannel(id, sub, name) {
	return {
		_id: `remotes.${id}.${sub}`,
		type: 'channel',
		common: { name },
		native: {},
	};
}

const REMOTE_INFO_STATES = [
	{
		sub: 'info.name',
		type: 'string',
		role: 'info.name',
		read: true,
		write: false,
	},
	{
		sub: 'info.battery',
		type: 'number',
		role: 'value.battery',
		read: true,
		write: false,
		unit: '%',
		min: 0,
		max: 100,
	},
	{
		sub: 'info.reachable',
		type: 'boolean',
		role: 'indicator.reachable',
		read: true,
		write: false,
	},
	{
		sub: 'info.lastSeen',
		type: 'string',
		role: 'date',
		read: true,
		write: false,
	},
];

const REMOTE_BUTTON_STATES = [
	{
		sub: 'button.lastEvent',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
	},
	{
		sub: 'button.lastEventName',
		type: 'string',
		role: 'text',
		read: true,
		write: false,
	},
	{
		sub: 'button.pressType',
		type: 'string',
		role: 'text',
		read: true,
		write: false,
		states: { short: 'short', hold: 'hold', release: 'release' },
	},
	{
		sub: 'button.activeZone',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
		states: { 0: 'all', 1: 'zone1', 2: 'zone2', 3: 'zone3' },
	},
];

const REMOTE_COLORWHEEL_STATES = [
	{
		sub: 'colorWheel.angle',
		type: 'number',
		role: 'value.angle',
		read: true,
		write: false,
		unit: '°',
		min: 0,
		max: 359,
	},
	{
		sub: 'colorWheel.x',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
	},
	{
		sub: 'colorWheel.y',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
	},
	{
		sub: 'colorWheel.hex',
		type: 'string',
		role: 'level.color.rgb',
		read: true,
		write: false,
	},
	{
		sub: 'colorWheel.triggered',
		type: 'boolean',
		role: 'indicator',
		read: true,
		write: false,
		def: false,
	},
];

const REMOTE_COLORTEMP_STATES = [
	{
		sub: 'colorTemp.value',
		type: 'number',
		role: 'level.color.temperature',
		read: true,
		write: false,
		unit: 'K',
	},
	{
		sub: 'colorTemp.mired',
		type: 'number',
		role: 'value',
		read: true,
		write: false,
	},
	{
		sub: 'colorTemp.pressType',
		type: 'string',
		role: 'text',
		read: true,
		write: false,
		states: { short: 'short', hold: 'hold' },
	},
];

// ─── Switch objects (generic Zigbee wall switches, not Tint remotes) ──────────

/**
 * Build a device object for a generic switch.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function switchDevice(id, name) {
	return {
		_id: `switches.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build a channel object for a switch sub-channel.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} sub - Channel name e.g. "info", "button"
 * @param {string} name - Display name
 * @returns {object} ioBroker channel object definition
 */
function switchChannel(id, sub, name) {
	return {
		_id: `switches.${id}.${sub}`,
		type: 'channel',
		common: { name },
		native: {},
	};
}

const SWITCH_INFO_STATES = [
	{ sub: 'info.name', type: 'string', role: 'info.name', read: true, write: false },
	{
		sub: 'info.battery',
		type: 'number',
		role: 'value.battery',
		read: true,
		write: false,
		unit: '%',
		min: 0,
		max: 100,
	},
	{ sub: 'info.reachable', type: 'boolean', role: 'indicator.reachable', read: true, write: false },
	{ sub: 'info.lastSeen', type: 'string', role: 'date', read: true, write: false },
];

const SWITCH_BUTTON_STATES = [
	{ sub: 'button.lastEvent', type: 'number', role: 'value', read: true, write: false },
	{ sub: 'button.lastEventName', type: 'string', role: 'text', read: true, write: false },
];

// ─── Sensor objects (temperature, humidity, motion, open/close, power, ...) ───

/**
 * Build a device object for a generic sensor.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function sensorDevice(id, name) {
	return {
		_id: `sensors.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build a channel object for a sensor sub-channel.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} sub - Channel name e.g. "info", "value"
 * @param {string} name - Display name
 * @returns {object} ioBroker channel object definition
 */
function sensorChannel(id, sub, name) {
	return {
		_id: `sensors.${id}.${sub}`,
		type: 'channel',
		common: { name },
		native: {},
	};
}

const SENSOR_INFO_STATES = [
	{ sub: 'info.name', type: 'string', role: 'info.name', read: true, write: false },
	{
		sub: 'info.battery',
		type: 'number',
		role: 'value.battery',
		read: true,
		write: false,
		unit: '%',
		min: 0,
		max: 100,
	},
	{ sub: 'info.reachable', type: 'boolean', role: 'indicator.reachable', read: true, write: false },
	{ sub: 'info.lastSeen', type: 'string', role: 'date', read: true, write: false },
];

// Type-specific value states, keyed by deCONZ sensor "type". Only the
// states relevant to a given sensor type get created — see
// main.js#_createSensorObjects/#_updateSensorStates for the dispatch.
const SENSOR_VALUE_STATES = {
	ZHATemperature: [
		{ sub: 'value.temperature', type: 'number', role: 'value.temperature', read: true, write: false, unit: '°C' },
	],
	ZHAHumidity: [
		{ sub: 'value.humidity', type: 'number', role: 'value.humidity', read: true, write: false, unit: '%' },
	],
	ZHAPressure: [
		{ sub: 'value.pressure', type: 'number', role: 'value.pressure', read: true, write: false, unit: 'hPa' },
	],
	ZHAOpenClose: [{ sub: 'value.open', type: 'boolean', role: 'sensor.window', read: true, write: false }],
	ZHAPresence: [{ sub: 'value.presence', type: 'boolean', role: 'sensor.motion', read: true, write: false }],
	ZHALightLevel: [
		{ sub: 'value.brightness', type: 'number', role: 'value.brightness', read: true, write: false, unit: 'lux' },
	],
	ZHAPower: [{ sub: 'value.power', type: 'number', role: 'value.power', read: true, write: false, unit: 'W' }],
	ZHAConsumption: [
		{
			sub: 'value.consumption',
			type: 'number',
			role: 'value.power.consumption',
			read: true,
			write: false,
			unit: 'kWh',
		},
	],
};

// Fallback for sensor types not covered by SENSOR_VALUE_STATES, so an
// unrecognized device still shows up with its raw value instead of nothing.
const SENSOR_GENERIC_VALUE_STATE = { sub: 'value.raw', type: 'mixed', role: 'value', read: true, write: false };

// ─── Cover objects (window covering motors / shutters) ────────────────────────

/**
 * Build a device object for a window covering.
 *
 * @param {string} id - deCONZ light id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function coverDevice(id, name) {
	return {
		_id: `covers.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build the info channel object for a cover.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function coverInfoChannel(id) {
	return {
		_id: `covers.${id}.info`,
		type: 'channel',
		common: { name: 'Info' },
		native: {},
	};
}

/**
 * Build the state channel object for a cover.
 *
 * @param {string} id - deCONZ light id
 * @returns {object} ioBroker channel object definition
 */
function coverStateChannel(id) {
	return {
		_id: `covers.${id}.state`,
		type: 'channel',
		common: { name: 'State' },
		native: {},
	};
}

const COVER_STATES = [
	{ sub: 'info.name', type: 'string', role: 'info.name', read: true, write: false },
	{ sub: 'info.modelid', type: 'string', role: 'info.hardware.serial', read: true, write: false },
	{ sub: 'info.manufacturer', type: 'string', role: 'info.hardware.model', read: true, write: false },
	{ sub: 'info.reachable', type: 'boolean', role: 'indicator.reachable', read: true, write: false },
	{ sub: 'info.uniqueid', type: 'string', role: 'info.address.ieee', read: true, write: false },
	{
		sub: 'state.position',
		type: 'number',
		role: 'level.blind',
		read: true,
		write: true,
		unit: '%',
		min: 0,
		max: 100,
	},
	{ sub: 'state.stop', type: 'boolean', role: 'button.stop', read: true, write: true, def: false },
];

// ─── Thermostat objects ────────────────────────────────────────────────────────

/**
 * Build a device object for a thermostat.
 *
 * @param {string} id - deCONZ sensor id
 * @param {string} name - Display name
 * @returns {object} ioBroker object definition
 */
function thermostatDevice(id, name) {
	return {
		_id: `thermostats.${id}`,
		type: 'device',
		common: { name, role: '' },
		native: { deconzId: id },
	};
}

/**
 * Build the info channel object for a thermostat.
 *
 * @param {string} id - deCONZ sensor id
 * @returns {object} ioBroker channel object definition
 */
function thermostatInfoChannel(id) {
	return {
		_id: `thermostats.${id}.info`,
		type: 'channel',
		common: { name: 'Info' },
		native: {},
	};
}

/**
 * Build the state channel object for a thermostat.
 *
 * @param {string} id - deCONZ sensor id
 * @returns {object} ioBroker channel object definition
 */
function thermostatStateChannel(id) {
	return {
		_id: `thermostats.${id}.state`,
		type: 'channel',
		common: { name: 'State' },
		native: {},
	};
}

const THERMOSTAT_STATES = [
	{ sub: 'info.name', type: 'string', role: 'info.name', read: true, write: false },
	{
		sub: 'info.battery',
		type: 'number',
		role: 'value.battery',
		read: true,
		write: false,
		unit: '%',
		min: 0,
		max: 100,
	},
	{ sub: 'info.reachable', type: 'boolean', role: 'indicator.reachable', read: true, write: false },
	{
		sub: 'state.temperature',
		type: 'number',
		role: 'value.temperature',
		read: true,
		write: false,
		unit: '°C',
	},
	{ sub: 'state.valve', type: 'number', role: 'value.valve', read: true, write: false, unit: '%', min: 0, max: 100 },
	{
		sub: 'state.setpoint',
		type: 'number',
		role: 'level.temperature',
		read: true,
		write: true,
		unit: '°C',
		min: 5,
		max: 32,
	},
];

// ─── Helper to build a state object definition ────────────────────────────────

/**
 * Build a full ioBroker state object definition
 *
 * @param {string} prefix       e.g. "lights.3"
 * @param {object} def          entry from one of the *_STATES arrays
 * @returns {object} Complete ioBroker state object definition
 */
function buildStateObj(prefix, def) {
	const common = {
		name: def.sub,
		type: def.type,
		role: def.role,
		read: def.read,
		write: def.write,
	};
	if (def.unit !== undefined) {
		common.unit = def.unit;
	}
	if (def.min !== undefined) {
		common.min = def.min;
	}
	if (def.max !== undefined) {
		common.max = def.max;
	}
	if (def.def !== undefined) {
		common.def = def.def;
	}
	if (def.states !== undefined) {
		common.states = def.states;
	}

	return {
		_id: `${prefix}.${def.sub}`,
		type: 'state',
		common,
		native: {},
	};
}

module.exports = {
	// Light
	lightDevice,
	lightInfoChannel,
	lightStateChannel,
	LIGHT_STATES,
	// Plug
	plugDevice,
	plugInfoChannel,
	plugStateChannel,
	PLUG_STATES,
	// Group
	groupDevice,
	groupInfoChannel,
	groupActionChannel,
	groupScenesChannel,
	GROUP_INFO_STATES,
	GROUP_ACTION_STATES,
	// Remote
	remoteDevice,
	remoteChannel,
	REMOTE_INFO_STATES,
	REMOTE_BUTTON_STATES,
	REMOTE_COLORWHEEL_STATES,
	REMOTE_COLORTEMP_STATES,
	// Switch
	switchDevice,
	switchChannel,
	SWITCH_INFO_STATES,
	SWITCH_BUTTON_STATES,
	// Sensor
	sensorDevice,
	sensorChannel,
	SENSOR_INFO_STATES,
	SENSOR_VALUE_STATES,
	SENSOR_GENERIC_VALUE_STATE,
	// Cover
	coverDevice,
	coverInfoChannel,
	coverStateChannel,
	COVER_STATES,
	// Thermostat
	thermostatDevice,
	thermostatInfoChannel,
	thermostatStateChannel,
	THERMOSTAT_STATES,
	// Helper
	buildStateObj,
};
