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
	}

	// ─── Generic request helpers ─────────────────────────────────────────────

	/**
	 * Perform a GET request against the deCONZ REST API.
	 *
	 * @param {string} path - API path relative to /api/{key}
	 * @returns {Promise<object>} Parsed response body
	 */
	async _get(path) {
		try {
			const res = await this._client.get(path);
			return res.data;
		} catch (err) {
			this.log.error(`deCONZ GET ${path} failed: ${err.message}`);
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
		try {
			const res = await this._client.put(path, body);
			return res.data;
		} catch (err) {
			this.log.error(`deCONZ PUT ${path} failed: ${err.message}`);
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
		try {
			const res = await this._client.post(path, body);
			return res.data;
		} catch (err) {
			this.log.error(`deCONZ POST ${path} failed: ${err.message}`);
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
		try {
			const res = await this._client.delete(path);
			return res.data;
		} catch (err) {
			this.log.error(`deCONZ DELETE ${path} failed: ${err.message}`);
			throw err;
		}
	}

	// ─── Connection test ──────────────────────────────────────────────────────

	/**
	 * Verify API key is valid by fetching the gateway config.
	 *
	 * @returns {Promise<boolean>} True if connection succeeded
	 */
	async testConnection() {
		try {
			const data = await this._get('/config');
			return !!(data && data.name);
		} catch {
			return false;
		}
	}

	// ─── Lights ───────────────────────────────────────────────────────────────

	/**
	 * Get all lights.
	 *
	 * @returns {Promise<object>} Map of id → light object
	 */
	async getLights() {
		return await this._get('/lights');
	}

	/**
	 * Get single light by id.
	 *
	 * @param {string} lightId - deCONZ light id
	 * @returns {Promise<object>} Light object
	 */
	async getLight(lightId) {
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
		return await this._put(`/lights/${lightId}/state`, state);
	}

	// ─── Groups ───────────────────────────────────────────────────────────────

	/**
	 * Get all groups.
	 *
	 * @returns {Promise<object>} Map of id → group object
	 */
	async getGroups() {
		return await this._get('/groups');
	}

	/**
	 * Get single group including its scenes.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @returns {Promise<object>} Group object with scenes array
	 */
	async getGroup(groupId) {
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
		return await this._post('/groups', { name, lights });
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
		return await this._put(`/groups/${groupId}`, { name, lights });
	}

	/**
	 * Delete a group.
	 *
	 * @param {string} groupId - deCONZ group id
	 * @returns {Promise<Array>} deCONZ response array
	 */
	async deleteGroup(groupId) {
		return await this._delete(`/groups/${groupId}`);
	}

	// ─── Sensors (Remotes) ────────────────────────────────────────────────────

	/**
	 * Get all sensors (includes Tint remotes).
	 *
	 * @returns {Promise<object>} Map of id → sensor object
	 */
	async getSensors() {
		return await this._get('/sensors');
	}

	/**
	 * Get single sensor by id.
	 *
	 * @param {string} sensorId - deCONZ sensor id
	 * @returns {Promise<object>} Sensor object
	 */
	async getSensor(sensorId) {
		return await this._get(`/sensors/${sensorId}`);
	}

	// ─── Pairing ─────────────────────────────────────────────────────────────

	/**
	 * Request a new API key from deCONZ while the pairing window is open.
	 * The user must first open Phoscon → ☰ → Gateway → Authenticate app.
	 *
	 * @param {string} ip   - deCONZ host IP
	 * @param {number} port - deCONZ REST port
	 * @returns {Promise<string>} The new API key (username)
	 */
	static async pair(ip, port) {
		let body;
		try {
			const res = await axios.post(
				`http://${ip}:${port}/api`,
				{ devicetype: 'ioBroker.tint' },
				{ timeout: 8000, headers: { 'Content-Type': 'application/json' } },
			);
			body = res.data;
		} catch (err) {
			// deCONZ may return error details even on non-2xx status
			if (err.response?.data) {
				body = err.response.data;
			} else {
				throw new Error(err.message);
			}
		}

		if (Array.isArray(body) && body[0]?.success?.username) {
			return body[0].success.username;
		}
		if (Array.isArray(body) && body[0]?.error) {
			const { type, description } = body[0].error;
			// type 101 = link button (pairing window) not pressed
			if (type === 101) {
				throw new Error(
					'deCONZ pairing window is not open. Please go to Phoscon → ☰ → Gateway → Authenticate app first.',
				);
			}
			throw new Error(description || `deCONZ error type ${type}`);
		}
		throw new Error(`Unexpected response from deCONZ: ${JSON.stringify(body)}`);
	}
}

module.exports = DeconzApi;
