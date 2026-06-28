import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: __dirname,
	plugins: [react()],
	build: {
		outDir: 'build',
		emptyOutDir: false, // panels build already in build/; only add tab.js + tab.css
		target: 'esnext',
		minify: true,
		cssCodeSplit: false,
		rollupOptions: {
			input: resolve(__dirname, 'src/tab/main.jsx'),
			output: {
				format: 'iife',
				name: 'TintTab',
				inlineDynamicImports: true,
				entryFileNames: 'tab.js',
				assetFileNames: 'tab[extname]',
			},
		},
	},
});
