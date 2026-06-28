import React from 'react';
import { createRoot } from 'react-dom/client';
import TabApp from './TabApp.jsx';

const params = new URLSearchParams(window.location.search);
const instance = parseInt(params.get('instance') ?? '0', 10);
const lang = params.get('lang') ?? 'en';
const themeType = params.get('themeType') ?? 'light';

// Admin serves socket.io at the same origin; window.io is the global factory
// injected by /socket.io/socket.io.js, loaded before this bundle in tab_m.html.
const socket = window.io('/', { path: '/socket.io', query: { name: 'tint-tab' } });

createRoot(document.getElementById('root')).render(
	<TabApp socket={socket} instance={instance} lang={lang} themeType={themeType} />,
);
