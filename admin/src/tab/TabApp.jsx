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

		connection.getState(aliveId)
			.then(st => setAlive(!!st?.val))
			.catch(() => {});

		const onStateChange = (_id, st) => setAlive(!!st?.val);
		connection.subscribeState(aliveId, onStateChange);

		return () => {
			connection.unsubscribeState(aliveId, onStateChange);
		};
	}, [connection, instance]);

	const sendToAdapter = useCallback(
		(command, data) =>
			connection.sendTo(`tint.${instance}`, command, data || {})
				.then(result => result ?? {})
				.catch(err => ({ error: err?.message || String(err) })),
		[connection, instance],
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
					<Component sendToAdapter={sendToAdapter} t={t} alive={alive} />
				</Box>
			</Box>
		</ThemeProvider>
	);
}
