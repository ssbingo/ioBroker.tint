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
	 * @param {(callback: () => void, ms: number) => number} [options.setTimeout] - Adapter-tracked setTimeout (for clean unload)
	 */
	constructor(options) {
		this.ip = options.ip;
		this.wsPort = options.wsPort;
		this.log = options.log;
		this.onEvent = options.onEvent;
		this.onOpen = options.onOpen;
		this.onClose = options.onClose;
		this._setTimeoutFn = options.setTimeout || setTimeout;

		this._ws = null;
		this._reconnectTimer = null;
		this._stopped = false;
		this._reconnectDelay = 5000;

		this.log.debug(`DeconzWebSocket initialised — endpoint: ws://${this.ip}:${this.wsPort}`);
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	/**
	 * Open the WebSocket connection to deCONZ.
	 * Automatically schedules reconnect on failure or close.
	 */
	connect() {
		if (this._stopped) {
			this.log.debug('WebSocket connect() called after stop — ignoring');
			return;
		}

		const url = `ws://${this.ip}:${this.wsPort}`;
		this.log.debug(`WebSocket: connecting to ${url}`);

		try {
			this._ws = new WebSocket(url);
		} catch (err) {
			this.log.error(`WebSocket: constructor failed for ${url} — ${err.message}`);
			this._scheduleReconnect();
			return;
		}

		this._ws.on('open', () => {
			this.log.info(`WebSocket: connected to deCONZ at ws://${this.ip}:${this.wsPort}`);
			this.log.debug('WebSocket: resetting reconnect back-off to 5 s');
			this._reconnectDelay = 5000;
			if (this.onOpen) {
				this.onOpen();
			}
		});

		this._ws.on('message', data => {
			let event;
			try {
				event = JSON.parse(data.toString());
			} catch (err) {
				const raw = data.toString().slice(0, 200);
				this.log.warn(`WebSocket: message parse error — ${err.message}  raw: "${raw}"`);
				return;
			}

			this.log.debug(
				`WebSocket ← e="${event.e}" r="${event.r}" id="${event.id}"${event.t ? ` t="${event.t}"` : ''}${
					event.state ? ` state=${JSON.stringify(event.state)}` : ''
				}${
					event.action ? ` action=${JSON.stringify(event.action)}` : ''
				}${event.attr ? ` attr=${JSON.stringify(event.attr)}` : ''}`,
			);

			if (this.onEvent) {
				this.onEvent(event);
			}
		});

		this._ws.on('error', err => {
			this.log.error(`WebSocket: error — ${err.message}`);
		});

		this._ws.on('close', (code, reason) => {
			const reasonStr = reason ? reason.toString() : 'no reason given';
			this.log.warn(`WebSocket: closed — code=${code}, reason="${reasonStr}"`);
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
		this.log.info('WebSocket: adapter is stopping — closing connection and cancelling reconnects');
		this._stopped = true;
		if (this._reconnectTimer) {
			this.log.debug('WebSocket: clearing pending reconnect timer');
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
		if (this._ws) {
			this.log.debug('WebSocket: terminating socket');
			try {
				this._ws.terminate();
			} catch {
				/* ignore */
			}
			this._ws = null;
		}
		this.log.debug('WebSocket: closed cleanly');
	}

	// ─── Reconnect with exponential back-off (max 60s) ───────────────────────

	/**
	 * Schedule a reconnect attempt with exponential back-off (5s → 10s → … → 60s).
	 */
	_scheduleReconnect() {
		if (this._stopped) {
			this.log.debug('WebSocket: _scheduleReconnect called after stop — ignoring');
			return;
		}
		const delaySec = this._reconnectDelay / 1000;
		this.log.info(`WebSocket: reconnecting in ${delaySec} s…`);
		this._reconnectTimer = this._setTimeoutFn(() => {
			this._reconnectTimer = null;
			this.log.debug('WebSocket: reconnect timer fired — calling connect()');
			this.connect();
		}, this._reconnectDelay);
		// Exponential back-off: 5s → 10s → 20s → 40s → 60s
		const nextDelay = Math.min(this._reconnectDelay * 2, 60000);
		this.log.debug(`WebSocket: back-off updated ${this._reconnectDelay / 1000}s → ${nextDelay / 1000}s`);
		this._reconnectDelay = nextDelay;
	}
}

module.exports = DeconzWebSocket;
