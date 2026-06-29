import React from 'react';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

const lightListSx = {
	maxHeight: 320,
	overflowY: 'auto',
	border: '1px solid',
	borderColor: 'divider',
	borderRadius: 1,
	padding: '0 8px',
};
const lightSubSx = { color: 'text.secondary', fontSize: '0.75rem' };

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
		<Dialog
			open={open}
			onClose={(event, reason) => {
				if (reason === 'backdropClick' && saving) return;
				onClose();
			}}
			maxWidth="xs"
			fullWidth
		>
			<DialogTitle>{isEdit ? t('dlgEditGroup') : t('dlgNewGroup')}</DialogTitle>
			<DialogContent>
				<TextField
					sx={{ marginBottom: 2 }}
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
				<Box sx={lightListSx}>
					{lightEntries.length === 0 ? (
						<Typography variant="body2" sx={{ padding: '8px' }}>{t('msgNoLights')}</Typography>
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
										<span style={{ fontSize: '0.875rem' }}>{light.name}</span>
										{light.modelid && (
											<Box component="span" sx={lightSubSx}> ({light.modelid})</Box>
										)}
									</span>
								}
							/>
						))
					)}
				</Box>
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
