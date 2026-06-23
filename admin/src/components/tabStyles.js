/**
 * Shared `sx` style objects for the admin tab components (Lights/Plugs/
 * Covers/Groups/Scenes/Switches/Sensors/Thermostats). Extracted once during
 * the migration away from the old MUI v4 package, since all of these
 * components previously duplicated near-identical `makeStyles` blocks.
 *
 * Functions take `theme` directly — MUI's `sx` prop accepts either a plain
 * object or a `(theme) => object` callback, so these can be passed straight
 * through as `sx={tableHeadSx}` etc. without wrapping.
 */

export const barSx = theme => ({
	display: 'flex',
	alignItems: 'center',
	gap: 1,
	padding: '8px 16px',
	marginBottom: 2,
	borderRadius: 1,
	border: '1px solid',
	borderColor: 'divider',
	background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
});

export const dotSx = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, transition: 'background 0.3s' };
export const dotOkSx = { backgroundColor: '#4caf50' };
export const dotErrorSx = { backgroundColor: '#f44336' };
export const dotIdleSx = { backgroundColor: '#bdbdbd' };
export const spacerSx = { flex: 1 };

export const alertSx = {
	display: 'flex',
	alignItems: 'flex-start',
	gap: 1,
	padding: '12px 16px',
	borderRadius: 1,
	marginBottom: 2,
	fontSize: '0.875rem',
	lineHeight: 1.5,
};
export const alertErrorSx = { background: '#fdecea', border: '1px solid #ef9a9a', color: '#b71c1c' };
export const alertWarnSx = { background: '#fff8e1', border: '1px solid #ffe082', color: '#7b5000' };
export const alertInfoSx = { background: '#e3f2fd', border: '1px solid #90caf9', color: '#0d47a1' };

export const tableHeadSx = theme => ({
	background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fafafa',
});
export const tableRowSx = theme => ({ '&:hover': { background: theme.palette.action.hover } });

export const reachableSx = { color: '#2e7d32', fontWeight: 'bold' };
export const unreachableSx = { color: '#c62828', fontWeight: 'bold' };

export const centerSx = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	padding: 4,
	gap: 1,
	color: 'text.secondary',
};
