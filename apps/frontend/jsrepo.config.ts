import { defineConfig } from 'jsrepo';

export default defineConfig({
	registries: ['@ieedan/shadcn-svelte-extras'],
	paths: {
		ui: '#ui/primitives-new',
		block: '#ui/components',
		hook: '#ui/hooks',
		action: '#ui/actions',
		util: '#ui/lib/utils',
		lib: '#ui/lib'
	}
});
