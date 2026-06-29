import React from 'react';
import { useCallback } from 'react';
import SensorsTab from '../components/SensorsTab';
import { createT } from './i18n.js';

export default function SensorsPanel({ socket, instance, systemConfig, alive }) {
	const lang = systemConfig?.language;
	const t = createT(lang || 'en');

	const sendToAdapter = useCallback(
		(command, data) =>
			new Promise((resolve) => {
				const tid = setTimeout(() => resolve({ error: t('msgTimeout') }), 10000);
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
