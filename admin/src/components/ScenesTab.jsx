import React from 'react';
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
import StatusDot from './StatusDot';
import { barSx, spacerSx, alertSx, alertErrorSx, alertWarnSx, alertInfoSx, tableHeadSx, tableRowSx, centerSx } from './tabStyles';

export default function ScenesTab({ sendToAdapter, t, alive }) {
	const [scenes, setScenes] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [activatingKey, setActivatingKey] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		const res = await sendToAdapter('getGroups', {});
		setLoading(false);
		if (res && res.error) {
			setError(res.error);
			return;
		}
		if (res && res.groups) {
			const rows = [];
			for (const [groupId, group] of Object.entries(res.groups)) {
				for (const scene of group.scenes || []) {
					rows.push({ groupId, groupName: group.name, sceneId: scene.id, sceneName: scene.name });
				}
			}
			setScenes(rows);
		}
	}, [sendToAdapter]);

	useEffect(() => {
		if (alive !== false) load();
	}, [load, alive]);

	const activate = async (row) => {
		const key = `${row.groupId}/${row.sceneId}`;
		setActivatingKey(key);
		setError('');
		const res = await sendToAdapter('activateScene', {
			groupId: row.groupId,
			sceneId: row.sceneId,
			sceneName: row.sceneName,
		});
		setActivatingKey(null);
		if (res && res.error) {
			setError(res.error);
		}
	};

	/* Adapter offline */
	if (alive === false) {
		return (
			<Box sx={[alertSx, alertWarnSx]}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</Box>
		);
	}

	const rows = scenes || [];

	return (
		<Box sx={{ padding: '0 0 16px 0' }}>

			{/* Status / action bar */}
			<Box sx={barSx}>
				<StatusDot ok={error ? false : scenes !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !scenes
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: scenes !== null
						? `${rows.length} ${t('scenesCount')}`
						: '–'}
				</Typography>
				<Box sx={spacerSx} />
				<Button variant="outlined" size="small" onClick={load} disabled={loading}>
					{loading ? <CircularProgress size={14} /> : t('btnRefresh')}
				</Button>
			</Box>

			{/* Error */}
			{error && (
				<Box sx={[alertSx, alertErrorSx]}>
					<span>✖</span>
					<div>
						<strong>{t('msgError')}:</strong> {error}
					</div>
				</Box>
			)}

			{/* Loading spinner (initial load) */}
			{loading && !scenes && (
				<Box sx={centerSx}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</Box>
			)}

			{/* No scenes */}
			{!loading && !error && scenes !== null && rows.length === 0 && (
				<Box sx={[alertSx, alertInfoSx]}>
					<span>ℹ</span>
					<span>{t('msgNoScenes')}</span>
				</Box>
			)}

			{/* Scenes table */}
			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead sx={tableHeadSx}>
							<TableRow>
								<TableCell><strong>{t('colGroup')}</strong></TableCell>
								<TableCell><strong>{t('colScene')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colActions')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map((row) => {
								const key = `${row.groupId}/${row.sceneId}`;
								const isActivating = activatingKey === key;
								return (
									<TableRow key={key} sx={tableRowSx}>
										<TableCell>
											<Typography variant="body2">{row.groupName}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2"><strong>{row.sceneName}</strong></Typography>
										</TableCell>
										<TableCell align="right">
											<Button
												size="small"
												variant="outlined"
												onClick={() => activate(row)}
												disabled={activatingKey !== null}
												startIcon={isActivating ? <CircularProgress size={14} /> : undefined}
											>
												{t('btnActivate')}
											</Button>
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
