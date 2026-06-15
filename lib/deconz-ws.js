'use strict';

const WebSocket = require('ws');

/**
 * deCONZ WebSocket event handler.
 * Receives real-time push events for lights, groups and sensors.
 */
class DeconzWebSocket {
	/**
	 * @param {object} options - Connection options
	 * @param {string} options.ip - IP address of the deCONZ host
	 * @param {number} options.wsPort - WebSocket port (default 443)
	 * @param {object} options.log - ioBroker logger instance
	 * @param {(event: object) => void} options.onEvent - Callback for incoming WebSocket events
	 * @param {() => void} options.onOpen - Callback when connection is established
	 * @param {() => void} options.onClose - Callback when connection is lost
	 */
	constructor(options) {
		this.ip = options.ip;
		this.wsPort = options.wsPort;
		this.log = options.log;
		this.onEvent = options.onEvent;
		this.onOpen = options.onOpen;
		this.onClose = options.onClose;

		this._ws = null;
		this._reconnectTimer = null;
		this._stopped = false;
		this._reconnectDelay = 5000;
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	/**
	 * Open the WebSocket connection to deCONZ.
	 * Automatically schedules reconnect on failure or close.
	 */
	connect() {
		if (this._stopped) {
			return;
		}

		const url = `ws://${this.ip}:${this.wsPort}`;
		this.log.debug(`WebSocket connecting to ${url}`);

		try {
			this._ws = new WebSocket(url);
		} catch (err) {
			this.log.error(`WebSocket constructor failed: ${err.message}`);
			this._scheduleReconnect();
			return;
		}

		this._ws.on('open', () => {
			this.log.info('deCONZ WebSocket connected');
			this._reconnectDelay = 5000; // reset back-off
			if (this.onOpen) {
				this.onOpen();
			}
		});

		this._ws.on('message', data => {
			try {
				const event = JSON.parse(data.toString());
				if (this.onEvent) {
					this.onEvent(event);
				}
			} catch (err) {
				this.log.warn(`WebSocket message parse error: ${err.message}`);
			}
		});

		this._ws.on('error', err => {
			this.log.error(`WebSocket error: ${err.message}`);
		});

		this._ws.on('close', (code, reason) => {
			this.log.warn(`WebSocket closed (code=${code} reason=${reason})`);
			if (this.onClose) {
				this.onClose();
			}
			this._scheduleReconnect();
		});
	}

	/**
	 * Close the WebSocket connection and cancel any pending reconnect timer.
	 */
	close() {
		this._stopped = true;
		if (this._reconnectTimer) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		if (this._ws) {
			try {
				this._ws.terminate();
			} catch {
				/* ignore */
			}
			this._ws = null;
		}
	}

	// ─── Reconnect with exponential back-off (max 60s) ───────────────────────

	/**
	 * Schedule a reconnect attempt with exponential back-off (5s → 10s → … → 60s).
	 */
	_scheduleReconnect() {
		if (this._stopped) {
			return;
		}
		this.log.info(`WebSocket reconnecting in ${this._reconnectDelay / 1000}s…`);
		this._reconnectTimer = setTimeout(() => {
			this._reconnectTimer = null;
			this.connect();
		}, this._reconnectDelay);
		// Exponential back-off: 5s → 10s → 20s → 40s → 60s
		this._reconnectDelay = Math.min(this._reconnectDelay * 2, 60000);
	}
}

module.exports = DeconzWebSocket;
