<script lang="ts">
	import type { Snippet } from 'svelte';

	import { constructAdminBreadcrumbs } from '#components/admin/construct-admin-breadcrumbs.js';

	interface Props {
		// Defaults to the page's own breadcrumb.
		title?: string;
		// One line under the title saying what the page shows.
		description?: string;
		leftTitle?: Snippet;
		aboveTitle?: Snippet;
		belowTitle?: Snippet;
		// The page's actions, at the far end of the row.
		rightTitle?: Snippet;
		// Sits right after the title (a state badge, a count).
		children?: Snippet;
		class?: string;
	}

	let {
		title,
		description,
		belowTitle,
		aboveTitle,
		leftTitle,
		rightTitle,
		children,
		class: className = ''
	}: Props = $props();

	let resolvedTitle = $derived(title ?? constructAdminBreadcrumbs().at(-1)?.name ?? '');
</script>

<div class={['mb-3 flex min-h-10 flex-wrap items-center gap-x-4 gap-y-2', className]}>
	{@render leftTitle?.()}
	<div class="flex min-w-0 flex-col">
		{@render aboveTitle?.()}
		<h1 class="m-0 truncate text-xl leading-tight font-semibold">{resolvedTitle}</h1>
		{#if description}
			<p class="text-muted-foreground m-0 mt-0.5 text-sm">{description}</p>
		{/if}
		{@render belowTitle?.()}
	</div>
	{@render children?.()}
	{#if rightTitle}
		<div class="ml-auto flex shrink-0 flex-wrap items-center gap-2">
			{@render rightTitle()}
		</div>
	{/if}
</div>
