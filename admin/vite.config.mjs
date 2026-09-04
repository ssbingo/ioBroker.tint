import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Packages that ioBroker Admin provides as Module Federation singletons (see the
// mf-manifest.json shipped with iobroker.admin). `requiredVersion: '*'` accepts
// whatever generation the running admin ships: React 18 / MUI 6 on Admin 7.8.x
// and 7.9.x, React 19 / MUI 9 on Admin 8 (GUI API generation 2). Our own copies
// from node_modules are only emitted as a fallback and are never loaded as long
// as the admin provides these packages — that also keeps the remote small enough
// not to disturb admin's host-alive heartbeat handling.
const ADMIN_SHARED = ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'];

export default defineConfig({
	root: __dirname,
	plugins: [
		// Classic JSX runtime: JSX compiles to React.createElement() of the *shared*
		// `react`, i.e. the admin's own React copy. The automatic runtime would import
		// react/jsx-runtime instead, which Admin 7 does not share — the bundled fallback
		// of a different React major then creates elements the admin's renderer rejects
		// (Minified React error #31). With createElement the same build works on both
		// React 18 (Admin 7.8+) and React 19 (Admin 8) hosts.
		react({ jsxRuntime: 'classic' }),
		federation({
			name: 'tintComponents',
			filename: 'customComponents.js',
			// Admin 8 fetches build/mf-manifest.json next to customComponents.js and
			// checks the component against its GUI API generation (together with
			// "guiApi": 2 in admin/jsonConfig.json). Without the manifest and the
			// declaration the component is treated as generation 1 and not started.
			manifest: true,
			// Always prefer the copy the admin has already loaded over the (possibly
			// newer) fallback bundled with this remote: the admin's React must render
			// the admin's elements, never two React copies side by side.
			shareStrategy: 'loaded-first',
			exposes: { './Components': resolve(__dirname, 'src/panels/index.js') },
			shared: Object.fromEntries(ADMIN_SHARED.map(name => [name, { singleton: true, requiredVersion: '*' }])),
			dts: false,
		}),
	],
	build: {
		outDir: 'build',
		emptyOutDir: false, // must NOT wipe tab.js/tab.css already built there
		target: 'esnext',
		minify: true,
		cssCodeSplit: false,
		rollupOptions: {
			input: resolve(__dirname, 'src/panels/bootstrap.js'),
		},
	},
});
