import React, { useState, useEffect } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
	nameField: { marginBottom: theme.spacing(2) },
	lightList: {
		maxHeight: 320,
		overflowY: 'auto',
		border: '1px solid ' + theme.palette.divider,
		borderRadius: theme.shape.borderRadius,
		padding: theme.spacing(0, 1),
	},
	lightLabel: { fontSize: '0.875rem' },
	lightSub: { color: theme.palette.text.secondary, fontSize: '0.75rem' },
}));

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.group - null = create mode; object = edit mode (has .id, .name, .lights)
 * @param {object} props.allLights - map id→light from deCONZ
 * @param {function} props.onSave - (name, lightIds[]) => Promise<void>
 * @param {function} props.onClose
 * @param {function(string): string} props.t
 */
export default function GroupDialog({ open, group, allLights, onSave, onClose, t }) {
	const classes = useStyles();
	const [name, setName] = useState('');
	const [selected, setSelected] = useState({});
	const [saving, setSaving] = useState(false);
	const [nameError, setNameError] = useState(false);

	useEffect(() => {
		if (!open) return;
		setName(group ? group.name : '');
		const sel = {};
		if (group && Array.isArray(group.lights)) {
			group.lights.forEach((id) => { sel[id] = true; });
		}
		setSelected(sel);
		setSaving(false);
		setNameError(false);
	}, [open, group]);

	const toggleLight = (id) => {
		setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const handleSave = async () => {
		if (!name.trim()) {
			setNameError(true);
			return;
		}
		setSaving(true);
		const lightIds = Object.entries(selected)
			.filter(([, v]) => v)
			.map(([id]) => id);
		await onSave(name.trim(), lightIds);
		setSaving(false);
	};

	const lightEntries = allLights ? Object.entries(allLights) : [];
	const isEdit = !!group;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableBackdropClick={saving}>
			<DialogTitle>{isEdit ? t('dlgEditGroup') : t('dlgNewGroup')}</DialogTitle>
			<DialogContent>
				<TextField
					className={classes.nameField}
					label={t('dlgGroupName')}
					value={name}
					onChange={(e) => { setName(e.target.value); setNameError(false); }}
					error={nameError}
					helperText={nameError ? t('msgError') : ''}
					fullWidth
					autoFocus
					disabled={saving}
					variant="outlined"
					size="small"
				/>
				<Typography variant="subtitle2" gutterBottom>{t('dlgSelectLights')}</Typography>
				<div className={classes.lightList}>
					{lightEntries.length === 0 ? (
						<Typography variant="body2" style={{ padding: 8 }}>{t('msgNoLights')}</Typography>
					) : (
						lightEntries.map(([id, light]) => (
							<FormControlLabel
								key={id}
								control={
									<Checkbox
										checked={!!selected[id]}
										onChange={() => toggleLight(id)}
										size="small"
										disabled={saving}
										color="primary"
									/>
								}
								label={
									<span>
										<span className={classes.lightLabel}>{light.name}</span>
										{light.modelid && (
											<span className={classes.lightSub}> ({light.modelid})</span>
										)}
									</span>
								}
							/>
						))
					)}
				</div>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>{t('btnCancel')}</Button>
				<Button
					onClick={handleSave}
					color="primary"
					variant="contained"
					disabled={saving}
					startIcon={saving ? <CircularProgress size={16} /> : undefined}
				>
					{saving ? t('msgSaving') : t('btnSave')}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
