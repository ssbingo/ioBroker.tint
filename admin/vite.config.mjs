import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

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
		}),
	],
	build: {
		outDir: 'build',
		emptyOutDir: false, // must NOT wipe tab.js/tab.css already built there
		target: 'esnext',
		assetsDir: '',
		minify: true,
		rollupOptions: {
			input: resolve(__dirname, 'src/panels/bootstrap.js'),
			output: { format: 'esm', entryFileNames: '[name].js', chunkFileNames: '[name].js' },
		},
	},
});
