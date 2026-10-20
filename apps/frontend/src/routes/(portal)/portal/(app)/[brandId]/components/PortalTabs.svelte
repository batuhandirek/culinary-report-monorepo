<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '#ui/lib/utils.js';

	// The portal's sections, as links: each is its own page, so the back button and a shared
	// link land where they were.
	let { brandId }: { brandId: string } = $props();

	const TABS = [
		{ path: '', label: 'Report' },
		{ path: '/months', label: 'Months' },
		{ path: '/reviews', label: 'Reviews' },
		{ path: '/posts', label: 'Posts' },
		{ path: '/trends', label: 'Trends' },
		{ path: '/patterns', label: 'Patterns' },
		{ path: '/settings', label: 'Settings' }
	];

	const base = $derived(`/portal/${brandId}`);
	const isActive = (path: string) => {
		const here = page.url.pathname;
		return path ? here.startsWith(base + path) : here === base;
	};
</script>

<nav aria-label="Portal" class="border-line no-scrollbar -mx-4 overflow-x-auto border-b px-4">
	<ul class="m-0 flex list-none gap-6 p-0">
		{#each TABS as tab (tab.path)}
			{@const active = isActive(tab.path)}
			<li>
				<a
					href={base + tab.path}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'-mb-px inline-flex h-11 items-center border-b-[3px] text-[0.9375rem] whitespace-nowrap transition-colors',
						active
							? 'border-b-chili text-ink font-semibold'
							: 'text-muted-foreground hover:text-ink border-transparent font-medium'
					)}>
					{tab.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
