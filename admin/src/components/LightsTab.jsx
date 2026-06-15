import React, { useState, useEffect, useCallback } from 'react';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
	toolbar: {
		display: 'flex',
		justifyContent: 'flex-end',
		marginBottom: theme.spacing(1),
	},
	reachable: { color: '#4caf50', fontWeight: 'bold' },
	unreachable: { color: '#f44336', fontWeight: 'bold' },
	stateOn: { color: '#ff9800', fontWeight: 'bold' },
	stateOff: { color: '#9e9e9e' },
	center: { display: 'flex', justifyContent: 'center', padding: theme.spacing(4) },
}));

/**
 * @param {object} props
 * @param {function(string, object): Promise} props.sendToAdapter
 * @param {function(string): string} props.t
 */
export default function LightsTab({ sendToAdapter, t }) {
	const classes = useStyles();
	const [lights, setLights] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		const res = await sendToAdapter('getLights', {});
		setLoading(false);
		if (res && res.error) {
			setError(res.error);
		} else if (res && res.lights) {
			setLights(res.lights);
		}
	}, [sendToAdapter]);

	useEffect(() => { load(); }, [load]);

	if (loading) {
		return (
			<div className={classes.center}>
				<CircularProgress />
				<Typography style={{ marginLeft: 12 }}>{t('msgLoading')}</Typography>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<div className={classes.toolbar}>
					<Button variant="outlined" size="small" onClick={load}>{t('btnRefresh')}</Button>
				</div>
				<Typography color="error">{t('msgNotConnected')}</Typography>
				<Typography variant="caption" color="error">{error}</Typography>
			</div>
		);
	}

	const rows = lights ? Object.entries(lights) : [];

	return (
		<div>
			<div className={classes.toolbar}>
				<Button variant="outlined" size="small" onClick={load}>{t('btnRefresh')}</Button>
			</div>
			{rows.length === 0 ? (
				<Typography>{t('msgNoLights')}</Typography>
			) : (
				<TableContainer component={Paper}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell><strong>{t('colModel')}</strong></TableCell>
								<TableCell><strong>{t('colManufacturer')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colReachable')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colOnOff')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colBrightness')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, light]) => {
								const s = light.state || {};
								const bri = s.bri != null ? Math.round(s.bri / 2.54) + ' %' : '–';
								return (
									<TableRow key={id} hover>
										<TableCell>{light.name}</TableCell>
										<TableCell>{light.modelid || '–'}</TableCell>
										<TableCell>{light.manufacturername || '–'}</TableCell>
										<TableCell align="center">
											<span className={s.reachable ? classes.reachable : classes.unreachable}>
												{s.reachable ? t('stateYes') : t('stateNo')}
											</span>
										</TableCell>
										<TableCell align="center">
											<span className={s.on ? classes.stateOn : classes.stateOff}>
												{s.on ? t('stateOn') : t('stateOff')}
											</span>
										</TableCell>
										<TableCell align="right">{s.reachable ? bri : '–'}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</div>
	);
}
