import React from 'react';
import { createRoot } from 'react-dom/client';
import { Connection } from '@iobroker/socket-client';
import TabApp from './TabApp.jsx';

const params = new URLSearchParams(window.location.search);
const instance = parseInt(params.get('instance') ?? '0', 10);
const lang = params.get('lang') ?? 'en';
const themeType = params.get('themeType') ?? 'light';

// @iobroker/socket-client calls window.io.connect() internally — compatible
// with ioBroker's custom socket client (which exposes io as an object with
// a .connect method, not a directly-callable function).
const connection = new Connection({ name: 'tint-tab' });

createRoot(document.getElementById('root')).render(
	<TabApp connection={connection} instance={instance} lang={lang} themeType={themeType} />,
);
