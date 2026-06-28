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
import Tooltip from '@mui/material/Tooltip';
import { isCover } from './deviceCategory';
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

const ctrlBtnSx = { minWidth: 0, padding: '2px 8px', fontSize: '0.72rem', marginLeft: '3px' };

export default function CoversTab({ sendToAdapter, setDeviceState, instance, t, alive }) {
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

	const setCoverPosition = useCallback((id, position) => {
		setLights(prev => {
			if (!prev) return prev;
			const lift = 100 - position;
			return {
				...prev,
				[id]: { ...prev[id], state: { ...prev[id].state, lift, open: position > 0 } },
			};
		});
		setDeviceState(`tint.${instance}.covers.${id}.state.position`, position);
	}, [setDeviceState, instance]);

	const stopCover = useCallback((id) => {
		setDeviceState(`tint.${instance}.covers.${id}.state.stop`, true);
	}, [setDeviceState, instance]);

	if (alive === false) {
		return (
			<Box sx={[alertSx, alertWarnSx]}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</Box>
		);
	}

	const rows = lights ? Object.entries(lights).filter(([, light]) => isCover(light)) : [];

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
						? `${rows.length} ${t('coversCount')}`
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
					<span>{t('msgNoCovers')}</span>
				</Box>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead sx={tableHeadSx}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colReachable')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colPosition')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colControl')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, light]) => {
								const s = light.state || {};
								const position = s.lift !== undefined ? 100 - s.lift : s.open ? 100 : 0;
								return (
									<TableRow key={id} sx={tableRowSx}>
										<TableCell>
											<Typography variant="body2"><strong>{light.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell align="center">
											<Box component="span" sx={s.reachable ? reachableSx : unreachableSx}>
												{s.reachable ? '✔' : '✗'}
											</Box>
										</TableCell>
										<TableCell align="right">
											<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
												<Box sx={{ width: 48, height: 5, background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
													<Box sx={{ width: `${position}%`, height: '100%', background: '#1976d2', borderRadius: '3px' }} />
												</Box>
												<Typography variant="caption">{position} %</Typography>
											</Box>
										</TableCell>
										<TableCell align="center">
											<Tooltip title={t('btnOpen')}>
												<span>
													<Button
														sx={ctrlBtnSx}
														size="small"
														variant="outlined"
														disabled={!s.reachable}
														onClick={() => setCoverPosition(id, 100)}
													>
														↑
													</Button>
												</span>
											</Tooltip>
											<Tooltip title={t('btnStop')}>
												<span>
													<Button
														sx={ctrlBtnSx}
														size="small"
														variant="outlined"
														color="inherit"
														disabled={!s.reachable}
														onClick={() => stopCover(id)}
													>
														■
													</Button>
												</span>
											</Tooltip>
											<Tooltip title={t('btnClose')}>
												<span>
													<Button
														sx={ctrlBtnSx}
														size="small"
														variant="outlined"
														disabled={!s.reachable}
														onClick={() => setCoverPosition(id, 0)}
													>
														↓
													</Button>
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
