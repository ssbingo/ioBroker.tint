'use strict';

/**
 * Pragmatic heuristic to tell smart plugs/switches apart from real lights,
 * based on deCONZ's "type" field (e.g. "On/Off plug-in unit" vs.
 * "Extended color light"). Mirrors admin/src/components/deviceCategory.js —
 * not a full vendor/model database like Phoscon's, but good enough for the
 * common case.
 *
 * @param {object} light - Raw deCONZ light object
 * @returns {boolean} True if the device looks like a plug/switch, not a light
 */
function isPlug(light) {
	return (light?.type || '').toLowerCase().includes('plug');
}

/**
 * deCONZ reports window covering motors (shutters/blinds) under the same
 * /lights endpoint as real lights, with type "Window covering device".
 *
 * @param {object} light - Raw deCONZ light object
 * @returns {boolean} True if the device is a window covering motor
 */
function isCover(light) {
	return (light?.type || '').toLowerCase().includes('window covering');
}

/**
 * Tint remote controls are reported via /sensors with a type containing
 * "Switch" (deCONZ type "ZHASwitch"), same as generic Zigbee wall switches.
 * Müller Licht ("MLI") is the manufacturer code used for Tint remotes —
 * everything else with a "Switch" type is treated as a generic switch
 * instead of being run through the Tint-specific RemoteHandler.
 *
 * @param {object} sensor - Raw deCONZ sensor object
 * @returns {boolean} True if this looks like a Tint remote control
 */
function isTintRemote(sensor) {
	return Boolean(sensor?.type && sensor.type.includes('Switch') && sensor.manufacturername === 'MLI');
}

module.exports = { isPlug, isCover, isTintRemote };
