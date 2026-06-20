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
import { isThermostat } from './deviceCategory';

const useStyles = makeStyles((theme) => ({
	root: { padding: theme.spacing(0, 0, 2, 0) },

	bar: {
		display: 'flex',
		alignItems: 'center',
		gap: theme.spacing(1),
		padding: theme.spacing(1, 2),
		marginBottom: theme.spacing(2),
		background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
		borderRadius: theme.shape.borderRadius,
		border: `1px solid ${theme.palette.divider}`,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: '50%',
		flexShrink: 0,
		transition: 'background 0.3s',
	},
	dotOk: { backgroundColor: '#4caf50' },
	dotError: { backgroundColor: '#f44336' },
	dotIdle: { backgroundColor: '#bdbdbd' },
	spacer: { flex: 1 },

	alert: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: theme.spacing(1),
		padding: theme.spacing(1.5, 2),
		borderRadius: theme.shape.borderRadius,
		marginBottom: theme.spacing(2),
		fontSize: '0.875rem',
		lineHeight: 1.5,
	},
	alertError: {
		background: '#fdecea',
		border: '1px solid #ef9a9a',
		color: '#b71c1c',
	},
	alertWarn: {
		background: '#fff8e1',
		border: '1px solid #ffe082',
		color: '#7b5000',
	},
	alertInfo: {
		background: '#e3f2fd',
		border: '1px solid #90caf9',
		color: '#0d47a1',
	},

	tableHead: { background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#fafafa' },
	tableRow: {
		'&:hover': { background: theme.palette.action.hover },
	},
	reachable: { color: '#2e7d32', fontWeight: 'bold' },
	unreachable: { color: '#c62828', fontWeight: 'bold' },

	center: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: theme.spacing(4),
		gap: theme.spacing(1),
		color: theme.palette.text.secondary,
	},
}));

function StatusDot({ classes, ok, loading }) {
	if (loading) return <CircularProgress size={10} />;
	return <span className={`${classes.dot} ${ok ? classes.dotOk : ok === null ? classes.dotIdle : classes.dotError}`} />;
}

export default function ThermostatsTab({ sendToAdapter, t, alive }) {
	const classes = useStyles();
	const [sensors, setSensors] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		const res = await sendToAdapter('getSensors', {});
		setLoading(false);
		if (res && res.error) {
			setError(res.error);
		} else if (res && res.sensors) {
			setSensors(res.sensors);
		}
	}, [sendToAdapter]);

	useEffect(() => {
		if (alive !== false) load();
	}, [load, alive]);

	if (alive === false) {
		return (
			<div className={`${classes.alert} ${classes.alertWarn}`}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</div>
		);
	}

	const rows = sensors ? Object.entries(sensors).filter(([, s]) => isThermostat(s)) : [];
	const dotOk = !error && sensors !== null;

	return (
		<div className={classes.root}>

			<div className={classes.bar}>
				<StatusDot classes={classes} ok={error ? false : sensors !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !sensors
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: sensors !== null
						? `${rows.length} ${t('thermostatsCount')}`
						: '–'}
				</Typography>
				<div className={classes.spacer} />
				<Button variant="outlined" size="small" onClick={load} disabled={loading}>
					{loading ? <CircularProgress size={14} /> : t('btnRefresh')}
				</Button>
			</div>

			{error && (
				<div className={`${classes.alert} ${classes.alertError}`}>
					<span>✖</span>
					<div>
						<strong>{t('msgError')}:</strong> {error}
					</div>
				</div>
			)}

			{loading && !sensors && (
				<div className={classes.center}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</div>
			)}

			{!loading && !error && sensors !== null && rows.length === 0 && (
				<div className={`${classes.alert} ${classes.alertInfo}`}>
					<span>ℹ</span>
					<span>{t('msgNoThermostats')}</span>
				</div>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead className={classes.tableHead}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colReachable')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colBattery')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colTemperature')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colSetpoint')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colValve')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, sensor]) => {
								const s = sensor.state || {};
								const c = sensor.config || {};
								return (
									<TableRow key={id} className={classes.tableRow}>
										<TableCell>
											<Typography variant="body2"><strong>{sensor.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell align="center">
											<span className={c.reachable ? classes.reachable : classes.unreachable}>
												{c.reachable ? '✔' : '✗'}
											</span>
										</TableCell>
										<TableCell align="center">
											<Typography variant="body2">
												{c.battery !== undefined ? `${c.battery} %` : '–'}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">
												{s.temperature !== undefined ? `${(s.temperature / 100).toFixed(1)} °C` : '–'}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">
												{c.heatsetpoint !== undefined ? `${(c.heatsetpoint / 100).toFixed(1)} °C` : '–'}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{s.valve !== undefined ? `${s.valve} %` : '–'}</Typography>
										</TableCell>
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
