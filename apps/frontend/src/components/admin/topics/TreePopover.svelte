<script lang="ts">
	import { ArrowLeft, ChevronDown, ListTree } from '@lucide/svelte';

	import ExplorerTree, { type ExplorerNode } from './ExplorerTree.svelte';

	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';

	// The tree around a topic or an aspect, kept out of the page: a pill beside the name saying how
	// many it holds, opening the file-explorer tree in a card (a sheet on a phone), the open page
	// marked and its branch opened. Picking a row goes to its page.
	interface Props {
		nodes: ExplorerNode[];
		current: string;
		href: (key: string) => string;
		countLabel: string;
		/** The pill's words: "Turkish tree", "All aspects" */
		label: string;
		/** The card's way out to the whole list */
		back: { href: string; label: string };
	}

	let { nodes, current, href, countLabel, label, back }: Props = $props();
	let open = $state(false);
</script>

<span class="border-line bg-paper hover:bg-wash inline-flex h-8 items-center rounded-full border text-sm">
	<ResponsivePopover bind:open title="Tree" hideHeader="popover" align="start" class="w-[24rem] max-w-[calc(100vw-2rem)] p-0">
		{#snippet trigger()}
			<span class="inline-flex h-8 items-center gap-1.5 px-3">
				<ListTree class="size-3.5" />
				{label}
				<span class="text-muted-foreground tabular-nums">{nodes.length}</span>
				<ChevronDown class="text-muted-foreground size-3.5" />
			</span>
		{/snippet}
		<div class="flex max-h-[70vh] flex-col">
			<ExplorerTree {nodes} {current} {href} {countLabel}>
				{#snippet head()}
					<a href={back.href} class="text-muted-foreground hover:text-ink inline-flex items-center gap-1.5 text-sm no-underline">
						<ArrowLeft class="size-3.5" /> {back.label}
					</a>
				{/snippet}
			</ExplorerTree>
		</div>
	</ResponsivePopover>
</span>
