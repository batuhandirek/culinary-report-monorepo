<script lang="ts">
	import { MessagesSquare, Plus, Trash2 } from '@lucide/svelte';

	import type { AskThreadRow } from '../stores/AskStore.svelte.js';

	import { ago } from '#components/admin/admin-format.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	interface Props {
		threads: AskThreadRow[];
		activeId: string | null;
		loading: boolean;
		failed: boolean;
		hrefOf: (threadId: string | null) => string;
		onRetry: () => unknown;
		onDelete: (threadId: string) => unknown;
	}

	let { threads, activeId, loading, failed, hrefOf, onRetry, onDelete }: Props = $props();
	const cost = (usd: number) => (usd <= 0 ? '' : usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`);
</script>

<nav class="flex min-h-0 flex-col gap-2" aria-label="Threads">
	<Button href={hrefOf(null)} variant="outline" size="sm" icon={Plus} class="self-start">New question</Button>
	{#if loading}
		<SkeletonRows count={6} lines={2} />
	{:else if failed}
		<ErrorState title="The threads didn’t load" size="sm" {onRetry} />
	{:else if !threads.length}
		<EmptyState title="No questions yet" hint="Each question starts a thread you can follow up in." icon={MessagesSquare} size="sm" />
	{:else}
		<ul class="flex min-h-0 flex-col overflow-auto rounded-md border border-line bg-paper">
			{#each threads as thread (thread.id)}
				<li class={['group flex items-center border-b border-line last:border-b-0', thread.id === activeId && 'bg-tint']}>
					<a href={hrefOf(thread.id)} class="flex min-h-12 min-w-0 flex-1 flex-col justify-center px-3 py-2 no-underline">
						<span class="line-clamp-2 text-sm text-ink">{thread.title}</span>
						<span class="text-xs text-muted-foreground">
							{[thread.owner.firstName, ago(thread.lastMessageAt), cost(thread.usd)].filter(Boolean).join(' · ')}
						</span>
					</a>
					<PopConfirm
						title="Delete this thread?"
						description="Its questions, answers and every step go for good."
						confirmText="Delete"
						cancelText="Keep"
						destructive
						class="mr-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
						onConfirm={() => onDelete(thread.id)}>
						<span class="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-wash hover:text-ink" aria-label="Delete thread">
							<Trash2 class="size-4" />
						</span>
					</PopConfirm>
				</li>
			{/each}
		</ul>
	{/if}
</nav>
