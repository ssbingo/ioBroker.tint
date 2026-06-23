import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { isThermostat } from './deviceCategory';
import StatusDot from './StatusDot';
import {
	barSx,
	spacerSx,
	alertSx,
	alertErrorSx,
	alertWarnSx,
	alertInfoSx,
	tableHeadSx,
	tableRowSx,
	reachableSx,
	unreachableSx,
	centerSx,
} from './tabStyles';

export default function ThermostatsTab({ sendToAdapter, t, alive }) {
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
			<Box sx={[alertSx, alertWarnSx]}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</Box>
		);
	}

	const rows = sensors ? Object.entries(sensors).filter(([, s]) => isThermostat(s)) : [];

	return (
		<Box sx={{ padding: '0 0 16px 0' }}>

			<Box sx={barSx}>
				<StatusDot ok={error ? false : sensors !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !sensors
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: sensors !== null
						? `${rows.length} ${t('thermostatsCount')}`
						: '–'}
				</Typography>
				<Box sx={spacerSx} />
				<Button variant="outlined" size="small" onClick={load} disabled={loading}>
					{loading ? <CircularProgress size={14} /> : t('btnRefresh')}
				</Button>
			</Box>

			{error && (
				<Box sx={[alertSx, alertErrorSx]}>
					<span>✖</span>
					<div>
						<strong>{t('msgError')}:</strong> {error}
					</div>
				</Box>
			)}

			{loading && !sensors && (
				<Box sx={centerSx}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</Box>
			)}

			{!loading && !error && sensors !== null && rows.length === 0 && (
				<Box sx={[alertSx, alertInfoSx]}>
					<span>ℹ</span>
					<span>{t('msgNoThermostats')}</span>
				</Box>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead sx={tableHeadSx}>
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
									<TableRow key={id} sx={tableRowSx}>
										<TableCell>
											<Typography variant="body2"><strong>{sensor.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell align="center">
											<Box component="span" sx={c.reachable ? reachableSx : unreachableSx}>
												{c.reachable ? '✔' : '✗'}
											</Box>
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
		</Box>
	);
}
