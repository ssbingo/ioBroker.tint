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
			shared: {},
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
