import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	plugins: [
		react(),
		federation({
			name: 'tintComponents',
			filename: 'customComponents.js',
			exposes: { './Components': resolve(__dirname, 'src/panels/index.js') },
			// Share these with admin's own host bundle (confirmed via its
			// mf-manifest.json: react/react-dom 18.3.1, @mui/material 6.5.0,
			// @emotion/* 11.x) instead of bundling our own copies — avoids a
			// 400+ KB remote chunk that can otherwise block the browser's main
			// thread long enough to disrupt admin's host-alive heartbeat
			// handling (HostSelectors component).
			shared: {
				react: { singleton: true, requiredVersion: '*' },
				'react-dom': { singleton: true, requiredVersion: '*' },
				// react/jsx-runtime is a separate entry point from react and must be
				// shared explicitly — otherwise our chunk bundles React 19's jsx-runtime
				// while Admin's renderer uses React 18, causing React error #31 because
				// React 19 creates elements in a different format (ref moved into props)
				'react/jsx-runtime': { singleton: true, requiredVersion: '*' },
				'@mui/material': { singleton: true, requiredVersion: '*' },
				'@emotion/react': { singleton: true, requiredVersion: '*' },
				'@emotion/styled': { singleton: true, requiredVersion: '*' },
			},
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
