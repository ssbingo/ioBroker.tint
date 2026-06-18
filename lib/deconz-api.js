'use strict';

const axios = require('axios');

/**
 * deCONZ REST API wrapper.
 * Handles all HTTP communication with the deCONZ gateway.
 */
class DeconzApi {
	/**
	 * @param {object} options - Connection options
	 * @param {string} options.ip - IP address of the deCONZ host
	 * @param {number} options.port - REST API port (default 80)
	 * @param {string} options.apiKey - deCONZ API key
	 * @param {object} options.log - ioBroker logger instance
	 */
	constructor(options) {
		this.ip = options.ip;
		this.port = options.port;
		this.apiKey = options.apiKey;
		this.log = options.log;

		this._client = axios.create({
			baseURL: `http://${this.ip}:${this.port}/api/${this.apiKey}`,
			timeout: 10000,
			headers: { 'Content-Type': 'application/json' },
		});

		this.log.debug(
			`DeconzApi initialised — endpoint: http://${this.ip}:${this.port}/api/<key>, timeout: 10 000 ms`,
		);
	}

	// ─── Generic request helpers ─────────────────────────────────────────────

	/**
	 * Perform a GET request against the deCONZ REST API.
	 *
	 * @param {string} path - API path relative to /api/{key}
	 * @returns {Promise<object>} Parsed response body
	 */
	async _get(path) {
		this.log.debug(`→ GET ${path}`);
		try {
			const res = await this._client.get(path);
			this.log.debug(`← GET ${path} [${res.status}] ${JSON.stringify(res.data).length} B`);
			return res.data;
		} catch (err) {
			this.log.error(`GET ${path} failed: ${err.message}`);
			throw err;
		}
	}

	/**
	 * Perform a PUT request against the deCONZ REST API.
	 *
	 * @param {string} path - API path relative to /api/{key}
	 * @param {object} body - Request body
	 * @returns {Promise<object>} Parsed response body
	 */
	async _put(path, body) {
		this.log.debug(`→ PUT ${path}  body=${JSON.stringify(body)}`);
		try {
			const res = await this._client.put(path, body);
			this.log.debug(`← PUT ${path} [${res.status}] ${JSON.stringify(res.data)}`);
			return res.data;
		} catch (err) {
			this.log.error(`PUT ${path} failed: ${err.message}`);
			throw err;
		}
	}

	/**
	 * Perform a POST request against the deCONZ REST API.
	 *
	 * @param {string} path - API path relative to /api/{key}
	 * @param {object} body - Request body
	 * @returns {Promise<object>} Parsed response body
	 */
	async _post(path, body) {
		this.log.debug(`→ POST ${path}  body=${JSON.stringify(body)}`);
		try {
			const res = await this._client.post(path, body);
			this.log.debug(`← POST ${path} [${res.status}] ${JSON.stringify(res.data)}`);
			return res.data;
		} catch (err) {
			this.log.error(`POST ${path} failed: ${err.message}`);
			throw err;
		}
	}

	/**
	 * Perform a DELETE request against the deCONZ REST API.
	 *
	 * @param {string} path - API path relative to /api/{key}
	 * @returns {Promise<object>} Parsed response body
	 */
	async _delete(path) {
		this.log.debug(`→ DELETE ${path}`);
		try {
			const res = await this._client.delete(path);
			this.log.debug(`← DELETE ${path} [${res.status}] ${JSON.stringify(res.data)}`);
			return res.data;
		} catch (err) {
			this.log.error(`DELETE ${path} failed: ${err.message}`);
			throw err;
		}
	}

	// ─── Connection test ──────────────────────────────────────────────────────

	/**
	 * Fetch the gateway configuration (GET /config).
	 *
	 * @returns {Promise<object|null>} Gateway config, or null on error
	 */
	async getConfig() {
		this.log.debug('Fetching deCONZ gateway config (GET /config)');
		try {
			return await this._get('/config');
		} catch {
			// error already logged by _get()
			return null;
		}
	}

	/**
	 * Verify API key is valid by fetching the gateway config.
	 *
	 * @returns {Promise<boolean>} True if connection succeeded
	 */
	async testConnection() {
		const data = await this.getConfig();
		if (data && data.name) {
			this.log.info(
				`Gateway info — name: "${data.name}", firmware: ${data.swversion || 'n/a'}, ` +
					`model: ${data.modelid || 'unknown'}, api: v${data.apiversion || 'n/a'}`,
			);
			return true;
		}
		this.log.error('Connection test failed — /config response is missing the "name" field');
		return false;
	}

	// ─── Lights ───────────────────────────────────────────────────────────────

	/**
	 * Get all lights.
	 *
	 * @returns {Promise<object>} Map of id → light object
	 */
	async getLights() {
		this.log.debug('getLights()');
		const lights = await this._get('/lights');
		this.log.debug(`getLights() → ${Object.keys(lights || {}).length} light(s)`);
		return lights;
	}

	/**
	 * Get single light by id.
	 *
	 * @param {string} lightId - deCONZ light id
	 * @returns {Promise<object>} Light object
	 */
	async getLight(lightId) {
		this.log.debug(`getLight(${lightId})`);
		return await this._get(`/lights/${lightId}`);
	}

	/**
	 * Set light state.
	 *
	 * @param {string} lightId - deCONZ light id
	 * @param {object} state - State to set e.g. { on: true, bri: 200, ct: 370 }
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async setLightState(lightId, state) {
		this.log.debug(`setLightState(${lightId}) body=${JSON.stringify(state)}`);
		return await this._put(`/lights/${lightId}/state`, state);
	}

	// ─── Groups ───────────────────────────────────────────────────────────────

	/**
	 * Get all groups.
	 *
	 * @returns {Promise<object>} Map of id → group object
	 */
	async getGroups() {
		this.log.debug('getGroups()');
		const groups = await this._get('/groups');
		this.log.debug(`getGroups() → ${Object.keys(groups || {}).length} group(s)`);
		return groups;
	}

	/**
	 * Get single group including its scenes.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @returns {Promise<object>} Group object with scenes array
	 */
	async getGroup(groupId) {
		this.log.debug(`getGroup(${groupId})`);
		return await this._get(`/groups/${groupId}`);
	}

	/**
	 * Set group action — affects all member lights simultaneously.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {object} action - Action to apply e.g. { on: true, bri: 200, ct: 370 }
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async setGroupAction(groupId, action) {
		this.log.debug(`setGroupAction(${groupId}) body=${JSON.stringify(action)}`);
		return await this._put(`/groups/${groupId}/action`, action);
	}

	/**
	 * Recall a scene within a group.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {string} sceneId - deCONZ scene id within the group
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async recallScene(groupId, sceneId) {
		this.log.debug(`recallScene(groupId=${groupId}, sceneId=${sceneId})`);
		return await this._put(`/groups/${groupId}/action`, { scene: sceneId });
	}

	/**
	 * Create a new group.
	 *
	 * @param {string} name - Group name
	 * @param {string[]} lights - Array of deCONZ light ids
	 * @returns {Promise<object>} deCONZ response (contains id of new group)
	 */
	async createGroup(name, lights) {
		this.log.info(`Creating group "${name}" with ${lights.length} member(s): [${lights.join(', ')}]`);
		const res = await this._post('/groups', { name, lights });
		const newId = Array.isArray(res) && res[0]?.success?.id;
		if (newId) {
			this.log.info(`Group created — id: ${newId}, name: "${name}"`);
		} else {
			this.log.warn(`Group creation for "${name}" returned unexpected response: ${JSON.stringify(res)}`);
		}
		return res;
	}

	/**
	 * Update an existing group's name and/or member lights.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @param {string} name - New group name
	 * @param {string[]} lights - New list of deCONZ light ids
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async updateGroup(groupId, name, lights) {
		this.log.info(`Updating group ${groupId}: name="${name}", members=[${lights.join(', ')}]`);
		const res = await this._put(`/groups/${groupId}`, { name, lights });
		this.log.info(`Group ${groupId} updated successfully`);
		return res;
	}

	/**
	 * Delete a group.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async deleteGroup(groupId) {
		this.log.info(`Deleting group ${groupId}`);
		const res = await this._delete(`/groups/${groupId}`);
		this.log.info(`Group ${groupId} deleted`);
		return res;
	}

	// ─── Sensors (Remotes) ────────────────────────────────────────────────────

	/**
	 * Get all sensors (includes Tint remotes).
	 *
	 * @returns {Promise<object>} Map of id → sensor object
	 */
	async getSensors() {
		this.log.debug('getSensors()');
		const sensors = await this._get('/sensors');
		this.log.debug(`getSensors() → ${Object.keys(sensors || {}).length} sensor(s)`);
		return sensors;
	}

	/**
	 * Get single sensor by id.
	 *
	 * @param {string} sensorId - deCONZ sensor id
	 * @returns {Promise<object>} Sensor object
	 */
	async getSensor(sensorId) {
		this.log.debug(`getSensor(${sensorId})`);
		return await this._get(`/sensors/${sensorId}`);
	}

	// ─── Pairing ─────────────────────────────────────────────────────────────

	/**
	 * Request a new API key from deCONZ while the pairing window is open.
	 * The user must first open Phoscon → ☰ → Gateway → Authenticate app.
	 *
	 * @param {string} ip   - deCONZ host IP
	 * @param {number} port - deCONZ REST port
	 * @param {object|null} [log] - Optional ioBroker logger for debug output
	 * @returns {Promise<string|null>} The new API key (username), or null if window not open yet
	 */
	static async pair(ip, port, log = null) {
		if (log) {
			log.debug(`Pairing: POST http://${ip}:${port}/api  body={"devicetype":"ioBroker.tint"}`);
		}
		let body;
		try {
			const res = await axios.post(
				`http://${ip}:${port}/api`,
				{ devicetype: 'ioBroker.tint' },
				{ timeout: 8000, headers: { 'Content-Type': 'application/json' } },
			);
			body = res.data;
			if (log) {
				log.debug(`Pairing: HTTP ${res.status} response — ${JSON.stringify(body)}`);
			}
		} catch (err) {
			// deCONZ may return error details even on non-2xx status
			if (err.response?.data) {
				body = err.response.data;
				if (log) {
					log.debug(`Pairing: HTTP ${err.response.status} non-2xx — body: ${JSON.stringify(body)}`);
				}
			} else {
				if (log) {
					log.error(`Pairing: request failed — ${err.message}`);
				}
				throw new Error(err.message);
			}
		}

		if (Array.isArray(body) && body[0]?.success?.username) {
			const username = body[0].success.username;
			if (log) {
				log.info(`Pairing successful — API key received (${username.length} chars)`);
			}
			return username;
		}
		if (Array.isArray(body) && body[0]?.error) {
			const { type, description } = body[0].error;
			if (type === 101) {
				if (log) {
					log.debug('Pairing: window not yet open (deCONZ error type 101) — will retry');
				}
				return null; // caller should retry
			}
			throw new Error(description || `deCONZ error type ${type}`);
		}
		throw new Error(`Unexpected response from deCONZ: ${JSON.stringify(body)}`);
	}
}

module.exports = DeconzApi;
