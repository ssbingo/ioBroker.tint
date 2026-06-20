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
import { isCover } from './deviceCategory';

const useStyles = makeStyles((theme) => ({
	root: { padding: theme.spacing(0, 0, 2, 0) },

	/* Status / action bar */
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

	/* Alerts */
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

	/* Table */
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

export default function CoversTab({ sendToAdapter, t, alive }) {
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

	useEffect(() => {
		if (alive !== false) load();
	}, [load, alive]);

	/* Adapter offline */
	if (alive === false) {
		return (
			<div className={`${classes.alert} ${classes.alertWarn}`}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</div>
		);
	}

	const rows = lights ? Object.entries(lights).filter(([, light]) => isCover(light)) : [];
	const dotOk = !error && lights !== null;

	return (
		<div className={classes.root}>

			{/* Status / action bar */}
			<div className={classes.bar}>
				<StatusDot classes={classes} ok={error ? false : lights !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !lights
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: lights !== null
						? `${rows.length} ${t('coversCount')}`
						: '–'}
				</Typography>
				<div className={classes.spacer} />
				<Button variant="outlined" size="small" onClick={load} disabled={loading}>
					{loading ? <CircularProgress size={14} /> : t('btnRefresh')}
				</Button>
			</div>

			{/* Error */}
			{error && (
				<div className={`${classes.alert} ${classes.alertError}`}>
					<span>✖</span>
					<div>
						<strong>{t('msgError')}:</strong> {error}
					</div>
				</div>
			)}

			{/* Loading spinner (initial load) */}
			{loading && !lights && (
				<div className={classes.center}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</div>
			)}

			{/* No covers */}
			{!loading && !error && lights !== null && rows.length === 0 && (
				<div className={`${classes.alert} ${classes.alertInfo}`}>
					<span>ℹ</span>
					<span>{t('msgNoCovers')}</span>
				</div>
			)}

			{/* Covers table */}
			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead className={classes.tableHead}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell><strong>{t('colModel')}</strong></TableCell>
								<TableCell><strong>{t('colManufacturer')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colReachable')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colPosition')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, light]) => {
								const s = light.state || {};
								const position = s.lift !== undefined ? 100 - s.lift : s.open ? 100 : 0;
								return (
									<TableRow key={id} className={classes.tableRow}>
										<TableCell>
											<Typography variant="body2"><strong>{light.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{light.modelid || '–'}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{light.manufacturername || '–'}</Typography>
										</TableCell>
										<TableCell align="center">
											<span className={s.reachable ? classes.reachable : classes.unreachable}>
												{s.reachable ? '✔' : '✗'}
											</span>
										</TableCell>
										<TableCell align="right">
											<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
												<div style={{ width: 48, height: 5, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
													<div style={{ width: `${position}%`, height: '100%', background: '#1976d2', borderRadius: 3 }} />
												</div>
												<Typography variant="caption">{position} %</Typography>
											</div>
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
