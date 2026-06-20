/**
 * Pragmatic heuristic to tell smart plugs/switches apart from real lights,
 * based on deCONZ's "type" field (e.g. "On/Off plug-in unit" vs.
 * "Extended color light"). Not a full vendor/model database like Phoscon's —
 * good enough for the common case.
 *
 * @param {object} light - Raw deCONZ light object
 * @returns {boolean} True if the device looks like a plug/switch, not a light
 */
export function isPlug(light) {
	return (light?.type || '').toLowerCase().includes('plug');
}

/**
 * deCONZ reports window covering motors (shutters/blinds) under the same
 * /lights endpoint as real lights, with type "Window covering device".
 *
 * @param {object} light - Raw deCONZ light object
 * @returns {boolean} True if the device is a window covering motor
 */
export function isCover(light) {
	return (light?.type || '').toLowerCase().includes('window covering');
}

/**
 * Tint remote controls are reported via /sensors with a type containing
 * "Switch" (deCONZ type "ZHASwitch"), same as generic Zigbee wall switches.
 * Müller Licht ("MLI") is the manufacturer code used for Tint remotes.
 *
 * @param {object} sensor - Raw deCONZ sensor object
 * @returns {boolean} True if this looks like a Tint remote control
 */
export function isTintRemote(sensor) {
	return Boolean(sensor?.type && sensor.type.includes('Switch') && sensor.manufacturername === 'MLI');
}

/**
 * @param {object} sensor - Raw deCONZ sensor object
 * @returns {boolean} True if this is a thermostat
 */
export function isThermostat(sensor) {
	return sensor?.type === 'ZHAThermostat';
}

/**
 * Format a sensor's primary reading with its unit, using the same scaling
 * as the backend (main.js#_updateSensorStates / lib/objects.js
 * #SENSOR_VALUE_STATES) — deCONZ reports temperature/humidity in
 * hundredths, consumption in Wh, etc.
 *
 * @param {object} sensor - Raw deCONZ sensor object
 * @param {function(string): string} [t] - Optional i18n function for the
 *   open/closed and motion/no-motion labels
 * @returns {string} Formatted value with unit, or "–" if not available
 */
export function formatSensorValue(sensor, t = key => key) {
	const s = sensor?.state || {};
	switch (sensor?.type) {
		case 'ZHATemperature':
			return s.temperature !== undefined ? `${(s.temperature / 100).toFixed(1)} °C` : '–';
		case 'ZHAHumidity':
			return s.humidity !== undefined ? `${(s.humidity / 100).toFixed(1)} %` : '–';
		case 'ZHAPressure':
			return s.pressure !== undefined ? `${s.pressure} hPa` : '–';
		case 'ZHAOpenClose':
			return s.open !== undefined ? t(s.open ? 'stateOpen' : 'stateClosed') : '–';
		case 'ZHAPresence':
			return s.presence !== undefined ? t(s.presence ? 'statePresence' : 'stateNoPresence') : '–';
		case 'ZHALightLevel': {
			let lux = s.lux;
			if (lux === undefined && s.lightlevel !== undefined) {
				lux = Math.round(Math.pow(10, (s.lightlevel - 1) / 10000));
			}
			return lux !== undefined ? `${lux} lx` : '–';
		}
		case 'ZHAPower':
			return s.power !== undefined ? `${s.power} W` : '–';
		case 'ZHAConsumption':
			return s.consumption !== undefined ? `${(s.consumption / 1000).toFixed(2)} kWh` : '–';
		default:
			return Object.keys(s).length > 0 ? JSON.stringify(s) : '–';
	}
}

// Lightweight, untranslated display names for deCONZ sensor "type" strings —
// not worth a full i18n round-trip for an internal technical label.
const SENSOR_TYPE_LABELS = {
	ZHATemperature: 'Temperature',
	ZHAHumidity: 'Humidity',
	ZHAPressure: 'Pressure',
	ZHAOpenClose: 'Open/Close',
	ZHAPresence: 'Motion',
	ZHALightLevel: 'Light level',
	ZHAPower: 'Power',
	ZHAConsumption: 'Consumption',
	Daylight: 'Daylight',
};

/**
 * @param {object} sensor - Raw deCONZ sensor object
 * @returns {string} Human-friendly label for the sensor's type, or the raw
 *   deCONZ type string if not in the known list
 */
export function formatSensorType(sensor) {
	return SENSOR_TYPE_LABELS[sensor?.type] || sensor?.type || '–';
}
