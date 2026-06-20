import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import SensorsTab from '../components/SensorsTab';
import { createT } from './i18n.js';

function SensorsPanelApp({ socket, instance, systemConfig, alive }) {
	const lang = systemConfig?.language;
	const t = createT(lang || 'en');

	const sendToAdapter = useCallback(
		(command, data) =>
			new Promise((resolve) => {
				const tid = setTimeout(
					() => resolve({ error: t('msgTimeout') }),
					10000,
				);
				socket.sendTo(`tint.${instance}`, command, data || {}).then((result) => {
					clearTimeout(tid);
					resolve(result);
				}).catch((err) => {
					clearTimeout(tid);
					resolve({ error: err?.message || String(err) });
				});
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[socket, instance, lang],
	);

	return <SensorsTab sendToAdapter={sendToAdapter} t={t} alive={alive} />;
}

/**
 * Outer shell returned into admin's React tree (no hooks, no React version conflict).
 * The inner app runs in its own ReactDOM root so hook dispatchers stay isolated.
 * setTimeout defers mount to the next tick, outside admin's commit phase.
 */
function SensorsPanel(props) {
	return React.createElement('div', {
		style: { width: '100%', fontFamily: 'Roboto, Arial, sans-serif' },
		ref: function (el) {
			if (!el) return;
			setTimeout(function () {
				try {
					ReactDOM.render(React.createElement(SensorsPanelApp, props), el);
				} catch (err) {
					el.innerHTML =
						'<p style="color:#c62828;padding:12px;background:#fdecea;border-radius:4px;margin:0">⚠ Panel error: ' +
						err.message +
						'</p>';
				}
			}, 0);
		},
	});
}

export default SensorsPanel;
