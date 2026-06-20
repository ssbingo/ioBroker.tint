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

module.exports = { isPlug };
