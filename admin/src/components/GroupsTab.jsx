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
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import GroupDialog from './GroupDialog';
import StatusDot from './StatusDot';
import { barSx, spacerSx, alertSx, alertErrorSx, alertWarnSx, alertInfoSx, tableHeadSx, tableRowSx, centerSx } from './tabStyles';

const sceneChipSx = { margin: '2px', height: 20, fontSize: '0.7rem' };
const actionBtnSx = { minWidth: 0, padding: '3px 10px', fontSize: '0.75rem', marginLeft: '4px' };

export default function GroupsTab({ sendToAdapter, setDeviceState, instance, t, alive }) {
	const [groups, setGroups] = useState(null);
	const [allLights, setAllLights] = useState({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editGroup, setEditGroup] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError('');
		const [gRes, lRes] = await Promise.all([
			sendToAdapter('getGroups', {}),
			sendToAdapter('getLights', {}),
		]);
		setLoading(false);
		if (gRes && gRes.error) { setError(gRes.error); return; }
		if (gRes && gRes.groups) setGroups(gRes.groups);
		if (lRes && lRes.lights) setAllLights(lRes.lights);
	}, [sendToAdapter]);

	useEffect(() => {
		if (alive !== false) load();
	}, [load, alive]);

	const toggleGroup = useCallback((id, anyOn) => {
		const newVal = !anyOn;
		setGroups(prev => prev ? {
			...prev,
			[id]: {
				...prev[id],
				state: { ...prev[id].state, any_on: newVal, all_on: newVal },
			},
		} : prev);
		setDeviceState(`tint.${instance}.groups.${id}.action.on`, newVal);
	}, [setDeviceState, instance]);

	if (alive === false) {
		return (
			<Box sx={[alertSx, alertWarnSx]}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</Box>
		);
	}

	const openCreate = () => { setEditGroup(null); setDialogOpen(true); };
	const openEdit = (id, group) => {
		setEditGroup({ id, name: group.name, lights: group.lights || [] });
		setDialogOpen(true);
	};
	const handleSave = async (name, lightIds) => {
		if (editGroup) {
			await sendToAdapter('updateGroup', { id: editGroup.id, name, lights: lightIds });
		} else {
			await sendToAdapter('createGroup', { name, lights: lightIds });
		}
		setDialogOpen(false);
		await load();
	};
	const handleDelete = async (id, name) => {
		if (!window.confirm(t('msgConfirmDelete').replace('%s', name))) return;
		await sendToAdapter('deleteGroup', { id });
		await load();
	};

	const rows = groups ? Object.entries(groups) : [];

	return (
		<Box sx={{ padding: '0 0 16px 0' }}>

			<Box sx={barSx}>
				<StatusDot ok={error ? false : groups !== null ? true : null} loading={loading} />
				<Typography variant="body2" color="textSecondary">
					{loading && !groups
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: groups !== null
						? `${rows.length} ${t('groupsCount')}`
						: '–'}
				</Typography>
				<Box sx={spacerSx} />
				<Button
					variant="contained"
					color="primary"
					size="small"
					onClick={openCreate}
					disabled={loading || !!error}
				>
					{t('btnNewGroup')}
				</Button>
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

			{loading && !groups && (
				<Box sx={centerSx}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</Box>
			)}

			{!loading && !error && groups !== null && rows.length === 0 && (
				<Box sx={[alertSx, alertInfoSx]}>
					<span>ℹ</span>
					<span>
						{t('msgNoGroups')}{' '}
						<Button
							size="small"
							color="primary"
							onClick={openCreate}
							sx={{ verticalAlign: 'baseline', padding: '0 4px', minHeight: 'unset' }}
						>
							{t('btnNewGroup')}
						</Button>
					</span>
				</Box>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead sx={tableHeadSx}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colLightCount')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colOnOff')}</strong></TableCell>
								<TableCell><strong>{t('colScenes')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colActions')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, group]) => {
								const st = group.state || {};
								const scenes = Array.isArray(group.scenes) ? group.scenes : [];
								const anyOn = !!st.any_on;
								const allOn = !!st.all_on;
								return (
									<TableRow key={id} sx={tableRowSx}>
										<TableCell>
											<Typography variant="body2"><strong>{group.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">
												ID {id} · {(group.lights || []).length} {t('lightsCount')}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Typography variant="body2">
												{(group.lights || []).length}
											</Typography>
										</TableCell>
										<TableCell align="center" sx={{ padding: '0 8px' }}>
											<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
												<Tooltip title={allOn ? t('stateAllOn') : anyOn ? t('statePartialOn') : t('stateAllOff')}>
													<span>
														<Switch
															checked={anyOn}
															onChange={() => toggleGroup(id, anyOn)}
															size="small"
															color="warning"
														/>
													</span>
												</Tooltip>
												{anyOn && !allOn && (
													<Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
														{t('statePartial')}
													</Typography>
												)}
											</Box>
										</TableCell>
										<TableCell>
											{scenes.length === 0 ? (
												<Typography variant="caption" color="textSecondary">–</Typography>
											) : (
												scenes.map((sc) => (
													<Chip key={sc.id} label={sc.name} size="small" sx={sceneChipSx} />
												))
											)}
										</TableCell>
										<TableCell align="right">
											<Tooltip title={t('btnEdit')}>
												<Button
													sx={actionBtnSx}
													size="small"
													variant="outlined"
													onClick={() => openEdit(id, group)}
												>
													{t('btnEdit')}
												</Button>
											</Tooltip>
											<Tooltip title={t('btnDelete')}>
												<Button
													sx={actionBtnSx}
													size="small"
													variant="outlined"
													color="secondary"
													onClick={() => handleDelete(id, group.name)}
												>
													{t('btnDelete')}
												</Button>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			<GroupDialog
				open={dialogOpen}
				group={editGroup}
				allLights={allLights}
				onSave={handleSave}
				onClose={() => setDialogOpen(false)}
				t={t}
			/>
		</Box>
	);
}
