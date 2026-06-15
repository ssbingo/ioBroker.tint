import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import GroupsTab from '../components/GroupsTab';
import { createT } from './i18n.js';

function GroupsPanelApp({ socket, instance, lang }) {
	const t = createT(lang || 'en');

	const sendToAdapter = useCallback(
		(command, data) =>
			new Promise((resolve) => {
				socket.sendTo(`tint.${instance}`, command, data || {}, resolve);
			}),
		[socket, instance],
	);

	return <GroupsTab sendToAdapter={sendToAdapter} t={t} />;
}

/**
 * Outer shell: returned into admin's React tree.
 * Uses our bundled React.createElement for the host div — React elements are
 * plain objects ($$typeof: Symbol.for('react.element')) and admin's reconciler
 * handles host elements ('div') from any React version.
 * The inner app runs in a separate ReactDOM root to avoid hook-dispatcher
 * conflicts between admin's React and our bundled React.
 */
function GroupsPanel(props) {
	return React.createElement('div', {
		style: { width: '100%', fontFamily: 'Roboto, Arial, sans-serif' },
		ref: function (el) {
			if (el) {
				ReactDOM.render(React.createElement(GroupsPanelApp, props), el);
			}
		},
	});
}

window.GroupsPanel = GroupsPanel;
