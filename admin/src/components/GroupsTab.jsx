import React, { useState, useEffect, useCallback } from 'react';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core/styles';
import GroupDialog from './GroupDialog';

const useStyles = makeStyles((theme) => ({
	root: { padding: theme.spacing(0, 0, 2, 0) },

	/* Toolbar */
	toolbar: {
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
	alertError: { background: '#fdecea', border: '1px solid #ef9a9a', color: '#b71c1c' },
	alertWarn:  { background: '#fff8e1', border: '1px solid #ffe082', color: '#7b5000' },
	alertInfo:  { background: '#e3f2fd', border: '1px solid #90caf9', color: '#0d47a1' },

	/* Table */
	tableHead: { background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#fafafa' },
	tableRow: { '&:hover': { background: theme.palette.action.hover } },

	stateOn:  { color: '#e65100', fontWeight: 'bold' },
	stateOff: { color: '#9e9e9e' },
	sceneChip: { margin: '2px', height: 20, fontSize: '0.7rem' },
	actionBtn: { minWidth: 0, padding: '3px 10px', fontSize: '0.75rem', marginLeft: 4 },

	center: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		padding: theme.spacing(4),
		gap: theme.spacing(1),
		color: theme.palette.text.secondary,
	},
}));

export default function GroupsTab({ sendToAdapter, t, alive }) {
	const classes = useStyles();
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

	/* Adapter offline */
	if (alive === false) {
		return (
			<div className={`${classes.alert} ${classes.alertWarn}`}>
				<span>⚠️</span>
				<span><strong>{t('msgAdapterOffline')}</strong></span>
			</div>
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
	const dotClass = error ? classes.dotError : groups !== null ? classes.dotOk : classes.dotIdle;

	return (
		<div className={classes.root}>

			{/* Toolbar */}
			<div className={classes.toolbar}>
				{loading ? <CircularProgress size={10} /> : <span className={`${classes.dot} ${dotClass}`} />}
				<Typography variant="body2" color="textSecondary">
					{loading && !groups
						? t('msgLoading')
						: error
						? t('msgNotConnected')
						: groups !== null
						? `${rows.length} ${t('groupsCount')}`
						: '–'}
				</Typography>
				<div className={classes.spacer} />
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

			{/* Loading spinner (initial) */}
			{loading && !groups && (
				<div className={classes.center}>
					<CircularProgress size={36} />
					<Typography variant="body2">{t('msgLoading')}</Typography>
				</div>
			)}

			{/* No groups */}
			{!loading && !error && groups !== null && rows.length === 0 && (
				<div className={`${classes.alert} ${classes.alertInfo}`}>
					<span>ℹ</span>
					<span>
						{t('msgNoGroups')}{' '}
						<Button
							size="small"
							color="primary"
							onClick={openCreate}
							style={{ verticalAlign: 'baseline', padding: '0 4px', minHeight: 'unset' }}
						>
							{t('btnNewGroup')}
						</Button>
					</span>
				</div>
			)}

			{/* Groups table */}
			{rows.length > 0 && (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead className={classes.tableHead}>
							<TableRow>
								<TableCell><strong>{t('colName')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colLightCount')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colAllOn')}</strong></TableCell>
								<TableCell align="center"><strong>{t('colAnyOn')}</strong></TableCell>
								<TableCell><strong>{t('colScenes')}</strong></TableCell>
								<TableCell align="right"><strong>{t('colActions')}</strong></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map(([id, group]) => {
								const st = group.state || {};
								const scenes = Array.isArray(group.scenes) ? group.scenes : [];
								return (
									<TableRow key={id} className={classes.tableRow}>
										<TableCell>
											<Typography variant="body2"><strong>{group.name}</strong></Typography>
											<Typography variant="caption" color="textSecondary">ID {id}</Typography>
										</TableCell>
										<TableCell align="center">
											<Typography variant="body2">
												{(group.lights || []).length}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<span className={st.all_on ? classes.stateOn : classes.stateOff}>
												{st.all_on ? t('stateYes') : t('stateNo')}
											</span>
										</TableCell>
										<TableCell align="center">
											<span className={st.any_on ? classes.stateOn : classes.stateOff}>
												{st.any_on ? t('stateYes') : t('stateNo')}
											</span>
										</TableCell>
										<TableCell>
											{scenes.length === 0 ? (
												<Typography variant="caption" color="textSecondary">–</Typography>
											) : (
												scenes.map((sc) => (
													<Chip key={sc.id} label={sc.name} size="small" className={classes.sceneChip} />
												))
											)}
										</TableCell>
										<TableCell align="right">
											<Tooltip title={t('btnEdit')}>
												<Button
													className={classes.actionBtn}
													size="small"
													variant="outlined"
													onClick={() => openEdit(id, group)}
												>
													{t('btnEdit')}
												</Button>
											</Tooltip>
											<Tooltip title={t('btnDelete')}>
												<Button
													className={classes.actionBtn}
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
		</div>
	);
}
