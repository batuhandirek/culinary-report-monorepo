import { sveltekitOG } from '@ethercorps/sveltekit-og/plugin';
import adapterNode from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

/** @type {import('vite').UserConfig} */ export default defineConfig({
	logLevel: 'warn',
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess({ script: true }),

			// vite-plugin-svelte options are passed straight through by sveltekit()
			inspector: true,
			onwarn: (warning, handler) => {
				// Suppress noisy compiler warnings during build
				const ignored = ['state_referenced_locally'];

				if (ignored.includes(warning.code)) return;

				handler(warning);
			},
			adapter: adapterNode({}),
			env: { dir: '../../env/web' }
		}),

		sveltekitOG({
			esmImport: false /* Crucial for reliable Wasm loading in Node.js */
		}),
		devtoolsJson()
	],
	server: {
		watch: {
			ignored: ['**/build/**']
		},
		proxy: {
			'/api': {
				target: 'http://localhost:3015',
				changeOrigin: true,
				ws: true
			}
		}
	}
});
