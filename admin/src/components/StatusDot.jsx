import React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { dotSx, dotOkSx, dotIdleSx, dotErrorSx } from './tabStyles';

/**
 * Small colored status indicator used in the status bar of every admin tab
 * (green = loaded ok, red = error, grey = idle/not loaded yet, spinner =
 * loading).
 *
 * @param {object} props
 * @param {boolean|null} props.ok - true=ok, false=error, null=idle
 * @param {boolean} props.loading
 */
export default function StatusDot({ ok, loading }) {
	if (loading) {
		return <CircularProgress size={10} />;
	}
	return <Box component="span" sx={[dotSx, ok ? dotOkSx : ok === null ? dotIdleSx : dotErrorSx]} />;
}
