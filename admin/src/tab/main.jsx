import React from 'react';
import { createRoot } from 'react-dom/client';
import { Connection } from '@iobroker/socket-client';
import TabApp from './TabApp.jsx';

const params = new URLSearchParams(window.location.search);
const instance = parseInt(params.get('instance') ?? '0', 10);
// ioBroker Admin may pass the language as "lang" or "language"; pass null if absent
// so TabApp falls back to reading it from the system config via the connection.
const lang = params.get('lang') || params.get('language') || null;
// The theme is resolved inside TabApp (see theme.js): Admin passes no theme
// parameter to singleton tabs, but exposes it via localStorage and postMessage.

// @iobroker/socket-client calls window.io.connect() internally — compatible
// with ioBroker's custom socket client (which exposes io as an object with
// a .connect method, not a directly-callable function).
const connection = new Connection({ name: 'tint-tab' });

createRoot(document.getElementById('root')).render(
	<TabApp connection={connection} instance={instance} lang={lang} />,
);
