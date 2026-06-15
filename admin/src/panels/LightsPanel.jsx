import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import LightsTab from '../components/LightsTab';
import { createT } from './i18n.js';

function LightsPanelApp({ socket, instance, lang }) {
	const t = createT(lang || 'en');

	const sendToAdapter = useCallback(
		(command, data) =>
			new Promise((resolve) => {
				socket.sendTo(`tint.${instance}`, command, data || {}, resolve);
			}),
		[socket, instance],
	);

	return <LightsTab sendToAdapter={sendToAdapter} t={t} />;
}

/**
 * Outer shell: returned into admin's React tree (uses window.React).
 * Inner app: mounted into a dedicated div via our own ReactDOM root.
 * This avoids hook conflicts between admin's React and our bundled React.
 */
function LightsPanel(props) {
	return window.React.createElement('div', {
		style: { width: '100%', fontFamily: 'Roboto, Arial, sans-serif' },
		ref: function (el) {
			if (el) {
				ReactDOM.render(React.createElement(LightsPanelApp, props), el);
			}
		},
	});
}

window.LightsPanel = LightsPanel;
