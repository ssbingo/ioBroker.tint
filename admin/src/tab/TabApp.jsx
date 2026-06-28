import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LightsTab from '../components/LightsTab.jsx';
import GroupsTab from '../components/GroupsTab.jsx';
import PlugsTab from '../components/PlugsTab.jsx';
import CoversTab from '../components/CoversTab.jsx';
import SwitchesTab from '../components/SwitchesTab.jsx';
import SensorsTab from '../components/SensorsTab.jsx';
import ThermostatsTab from '../components/ThermostatsTab.jsx';
import { createT } from '../panels/i18n.js';

const CATEGORIES = [
	{ key: 'lights',      Component: LightsTab,      labelKey: 'tabLights' },
	{ key: 'groups',      Component: GroupsTab,       labelKey: 'tabGroups' },
	{ key: 'plugs',       Component: PlugsTab,        labelKey: 'tabPlugs' },
	{ key: 'covers',      Component: CoversTab,       labelKey: 'tabCovers' },
	{ key: 'switches',    Component: SwitchesTab,     labelKey: 'tabSwitches' },
	{ key: 'sensors',     Component: SensorsTab,      labelKey: 'tabSensors' },
	{ key: 'thermostats', Component: ThermostatsTab,  labelKey: 'tabThermostats' },
];

export default function TabApp({ connection, instance, lang, themeType }) {
	const [tabIndex, setTabIndex] = useState(0);
	const [alive, setAlive] = useState(false);
	const t = createT(lang || 'en');
	const theme = createTheme({ palette: { mode: themeType === 'dark' ? 'dark' : 'light' } });

	useEffect(() => {
		const aliveId = `system.adapter.tint.${instance}.alive`;
		const onStateChange = (_id, st) => setAlive(!!st?.val);

		const onConnectionChanged = async (connected) => {
			if (!connected) {
				setAlive(false);
				return;
			}
			try {
				const st = await connection.getState(aliveId);
				setAlive(!!st?.val);
				await connection.subscribeState(aliveId, onStateChange);
			} catch {
				// connection not ready yet — will retry on next connect event
			}
		};

		connection.registerConnectionHandler(onConnectionChanged);

		// If the connection was already established before this effect ran
		if (connection.isConnected()) {
			onConnectionChanged(true);
		}

		return () => {
			connection.unregisterConnectionHandler(onConnectionChanged);
			connection.unsubscribeState(aliveId, onStateChange);
		};
	}, [connection, instance]);

	const sendToAdapter = useCallback(
		(command, data) =>
			Promise.race([
				connection.sendTo(`tint.${instance}`, command, data || {})
					.then(result => result ?? {}),
				new Promise((_, rej) =>
					setTimeout(() => rej(new Error(t('msgTimeout'))), 10000),
				),
			]).catch(err => ({ error: err?.message || String(err) })),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[connection, instance, lang],
	);

	const setDeviceState = useCallback(
		(stateId, value) =>
			connection.setState(stateId, value).catch(err =>
				console.error(`[tint-tab] setState ${stateId} failed:`, err),
			),
		[connection],
	);

	const { Component } = CATEGORIES[tabIndex];

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
				<Tabs
					value={tabIndex}
					onChange={(_, v) => setTabIndex(v)}
					variant="scrollable"
					scrollButtons="auto"
					sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
				>
					{CATEGORIES.map(({ labelKey }) => (
						<Tab key={labelKey} label={t(labelKey)} />
					))}
				</Tabs>
				<Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
					<Component
						sendToAdapter={sendToAdapter}
						setDeviceState={setDeviceState}
						instance={instance}
						t={t}
						alive={alive}
					/>
				</Box>
			</Box>
		</ThemeProvider>
	);
}
