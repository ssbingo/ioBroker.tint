import React, { useState, useEffect, useCallback } from 'react';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import Chip from '@material-ui/core/Chip';
import { makeStyles } from '@material-ui/core/styles';
import GroupDialog from './GroupDialog';

const useStyles = makeStyles((theme) => ({
	toolbar: {
		display: 'flex',
		alignItems: 'center',
		gap: theme.spacing(1),
		marginBottom: theme.spacing(1),
	},
	spacer: { flex: 1 },
	stateOn: { color: '#ff9800', fontWeight: 'bold' },
	stateOff: { color: '#9e9e9e' },
	sceneChip: { margin: '2px', height: 20, fontSize: '0.7rem' },
	actionBtn: { minWidth: 0, padding: '4px 8px', fontSize: '0.75rem', marginRight: 4 },
	center: { display: 'flex', justifyContent: 'center', padding: theme.spacing(4) },
}));

/**
 * @param {object} props
 * @param {function(string, object): Promise} props.sendToAdapter
 * @param {function(string): string} props.t
 */
export default function GroupsTab({ sendToAdapter, t }) {
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
		if (gRes && gRes.error) {
			setError(gRes.error);
			return;
		}
		if (gRes && gRes.groups) setGroups(gRes.groups);
		if (lRes && lRes.lights) setAllLights(lRes.lights);
	}, [sendToAdapter]);

	useEffect(() => { load(); }, [load]);

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

	if (loading && !groups) {
		return (
			<div className={classes.center}>
				<CircularProgress />
				<Typography style={{ marginLeft: 12 }}>{t('msgLoading')}</Typography>
			</div>
		);
	}

	const rows = groups ? Object.entries(groups) : [];

	return (
		<div>
			<div className={classes.toolbar}>
				<Button variant="contained" color="primary" size="small" onClick={openCreate}>
					{t('btnNewGroup')}
				</Button>
				<div className={classes.spacer} />
				<Button variant="outlined" size="small" onClick={load} disabled={loading}>
					{loading ? <CircularProgress size={14} /> : t('btnRefresh')}
				</Button>
			</div>

			{error && (
				<Typography color="error" gutterBottom>
					{t('msgNotConnected')}<br />
					<small>{error}</small>
				</Typography>
			)}

			{!error && rows.length === 0 && (
				<Typography>{t('msgNoGroups')}</Typography>
			)}

			{rows.length > 0 && (
				<TableContainer component={Paper}>
					<Table size="small">
						<TableHead>
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
									<TableRow key={id} hover>
										<TableCell>{group.name}</TableCell>
										<TableCell align="center">
											{(group.lights || []).length}
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
											{scenes.map((sc) => (
												<Chip
													key={sc.id}
													label={sc.name}
													size="small"
													className={classes.sceneChip}
												/>
											))}
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
