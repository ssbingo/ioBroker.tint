/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Paper from '@material-ui/core/Paper';

import GenericApp from '@iobroker/adapter-react/GenericApp';

import LightsTab from './components/LightsTab';
import GroupsTab from './components/GroupsTab';

const styles = (theme) => ({
	root: {
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
	},
	tabBar: {
		borderBottom: '1px solid ' + theme.palette.divider,
	},
	content: {
		flex: 1,
		overflowY: 'auto',
		padding: theme.spacing(2),
	},
});

class TabApp extends GenericApp {
	constructor(props) {
		super(props, {
			...props,
			bottomButtons: false,
			encryptedFields: [],
			translations: {
				en: require('./i18n/en.json'),
				de: require('./i18n/de.json'),
				ru: require('./i18n/ru.json'),
				pt: require('./i18n/pt.json'),
				nl: require('./i18n/nl.json'),
				fr: require('./i18n/fr.json'),
				it: require('./i18n/it.json'),
				es: require('./i18n/es.json'),
				pl: require('./i18n/pl.json'),
				uk: require('./i18n/uk.json'),
				'zh-cn': require('./i18n/zh-cn.json'),
			},
		});
		this.state = { ...this.state, activeTab: 0 };
	}

	/**
	 * Send a command to the adapter instance and return the result as a Promise.
	 *
	 * @param {string} command
	 * @param {object} data
	 * @returns {Promise<object>}
	 */
	_send(command, data) {
		return new Promise((resolve) => {
			this.socket.sendTo(`tint.${this.instance}`, command, data || {}, resolve);
		});
	}

	render() {
		if (!this.state.loaded) {
			return super.render();
		}

		const { classes } = this.props;
		const { activeTab } = this.state;
		const t = (key) => this._(key);
		const send = this._send.bind(this);

		return (
			<div className={classes.root}>
				<Paper className={classes.tabBar} square elevation={1}>
					<Tabs
						value={activeTab}
						onChange={(_, v) => this.setState({ activeTab: v })}
						indicatorColor="primary"
						textColor="primary"
					>
						<Tab label={t('tabLights')} />
						<Tab label={t('tabGroups')} />
					</Tabs>
				</Paper>
				<div className={classes.content}>
					{activeTab === 0 && <LightsTab sendToAdapter={send} t={t} />}
					{activeTab === 1 && <GroupsTab sendToAdapter={send} t={t} />}
				</div>
			</div>
		);
	}
}

export default withStyles(styles)(TabApp);
