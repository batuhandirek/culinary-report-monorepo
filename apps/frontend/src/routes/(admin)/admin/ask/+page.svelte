<script lang="ts">
	import { Sparkles, WifiOff } from '@lucide/svelte';

	import { onDestroy, onMount, tick, untrack } from 'svelte';

	import AskComposer from './components/AskComposer.svelte';
	import AskMessage from './components/AskMessage.svelte';
	import AskThreads from './components/AskThreads.svelte';
	import { AskStore } from './stores/AskStore.svelte.js';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';
	import { apiErrorStatus } from '#lib/api.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Free questions about the data (`/admin/analyst`): threads on the left, the open one on the
	// right, answered live over the `analyst` socket. The open thread is `?thread=`, so a link
	// opens it.
	const store = new AskStore();
	const threadParam = $derived(page.url.searchParams.get('thread'));
	const hrefOf = (threadId: string | null) => (threadId ? `/admin/ask?thread=${threadId}` : '/admin/ask');

	const EXAMPLES = [
		'Which brands got the most posts by others last month, and how did that change on the month before?',
		'What do people complain about most at cafés in Berlin, as shares of written reviews?',
		'Which districts had the most openings in the last three months?',
		'Which dishes are rising in posts this quarter?'
	];
	let draft = $state('');

	onMount(() => {
		void store.connect();
		void store.loadThreads();
	});
	onDestroy(() => store.disconnect());

	$effect(() => {
		const threadId = threadParam;
		untrack(() => void store.open(threadId));
	});

	const ask = async (text: string) => {
		try {
			const threadId = await store.ask(text);
			if (threadId && threadId !== threadParam) await goto(hrefOf(threadId), { replace: false });
			return true;
		} catch (e) {
			notificationManager.addNotification({
				title: apiErrorStatus(e) === 409 ? 'The analyst is still answering the last question' : 'The question didn’t go through',
				error: true
			});
			return false;
		}
	};

	const remove = async (threadId: string) => {
		try {
			await store.remove(threadId);
			if (threadParam === threadId) await goto(hrefOf(null));
		} catch {
			notificationManager.addNotification({ title: 'The thread wasn’t deleted', error: true });
		}
	};

	// Keep the newest text in view while the answer is written, unless the admin scrolled up
	let scroller = $state<HTMLDivElement>();
	let pinned = true;
	const onScroll = () => {
		if (!scroller) return;
		pinned = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
	};
	$effect(() => {
		void JSON.stringify(store.messages.map((m) => [m.id, m.status, m.parts.length, m.parts.at(-1)?.data]));
		if (!pinned) return;
		void tick().then(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
	});
</script>

<AdminPageHeader description={findAdminMenu(page.url.pathname)?.description}>
	{#snippet rightTitle()}
		{#if !store.connected}
			<span class="flex items-center gap-1.5 text-xs text-muted-foreground"><WifiOff class="size-4" /> Not live: reload to see new parts</span>
		{/if}
	{/snippet}
</AdminPageHeader>

<div class="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
	<div class="min-h-0 lg:overflow-hidden">
		<AskThreads
			threads={store.threads}
			activeId={store.threadId}
			loading={store.threadsLoading}
			failed={store.threadsFailed}
			{hrefOf}
			onRetry={store.loadThreads}
			onDelete={remove} />
	</div>

	<section class="flex min-h-[60dvh] min-w-0 flex-col gap-3 lg:min-h-0">
		<div bind:this={scroller} onscroll={onScroll} class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
			{#if store.threadLoading}
				<SkeletonRows count={4} lines={3} />
			{:else if store.threadMissing}
				<EmptyState title="No such thread" hint="It may have been deleted." fill />
			{:else if store.threadFailed}
				<ErrorState title="The thread didn’t load" onRetry={store.retry} fill />
			{:else if !store.messages.length}
				<EmptyState
					title="Ask anything about the data"
					hint="The analyst plans, queries the database read-only and answers; every step it took stays open under its answer."
					icon={Sparkles}
					fill>
					<div class="flex max-w-2xl flex-wrap justify-center gap-2">
						{#each EXAMPLES as example (example)}
							<button
								type="button"
								class="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-xs text-ink hover:border-ink"
								onclick={() => (draft = example)}>
								{example}
							</button>
						{/each}
					</div>
				</EmptyState>
			{:else}
				{#each store.messages as message (message.id)}
					<AskMessage {message} />
				{/each}
			{/if}
		</div>
		<AskComposer bind:value={draft} busy={store.busy} sending={store.sending} onSubmit={ask} />
	</section>
</div>
