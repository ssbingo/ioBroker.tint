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
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { isPlug } from './deviceCategory';
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

export default function PlugsTab({ sendToAdapter, setDeviceState, instance, t, alive }) {
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

	const togglePlug = useCallback((id, currentOn) => {
		const newVal = !currentOn;
		setLights(prev => prev ? {
			...prev,
			[id]: { ...prev[id], state: { ...prev[id].state, on: newVal } },
		} : prev);
		// Plugs are stored under plugs.* in ioBroker (not lights.*)
		setDeviceState(`tint.${instance}.plugs.${id}.state.on`, newVal);
	}, [setDeviceState, instance]);

	if (alive === false) {
		return (
			<Box sx={[alertSx, alertWarnSx]}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</Box>
		);
	}

	const rows = lights ? Object.entries(lights).filter(([, light]) => isPlug(light)) : [];

	return (
		<Box sx={{ padding: '0 0 16px 0' }}>

			<Box sx={barSx}>
				<StatusDot ok={error ? false : lights !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !lights
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: lights !== null
						? `${rows.length} ${t('plugsCount')}`
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

			{loading && !lights && (
				<Box sx={centerSx}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</Box>
			)}

			{!loading && !error && lights !== null && rows.length === 0 && (
				<Box sx={[alertSx, alertInfoSx]}>
					<span>ℹ</span>
					<span>{t('msgNoPlugs')}</span>
				</Box>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead sx={tableHeadSx}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell><strong>{t('colModel')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colReachable')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colOnOff')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, light]) => {
								const s = light.state || {};
								return (
									<TableRow key={id} sx={tableRowSx}>
										<TableCell>
											<Typography variant="body2"><strong>{light.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{light.modelid || light.manufacturername || '–'}</Typography>
										</TableCell>
										<TableCell align="center">
											<Box component="span" sx={s.reachable ? reachableSx : unreachableSx}>
												{s.reachable ? '✔' : '✗'}
											</Box>
										</TableCell>
										<TableCell align="center" sx={{ padding: '0 8px' }}>
											<Tooltip title={s.reachable ? (s.on ? t('stateOn') : t('stateOff')) : t('msgNotReachable')}>
												<span>
													<Switch
														checked={!!s.on}
														onChange={() => togglePlug(id, s.on)}
														disabled={!s.reachable}
														size="small"
														color="primary"
													/>
												</span>
											</Tooltip>
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
