<script lang="ts">
	import type { ReportComments } from 'client';

	import { compact } from '#lib/culinary.js';

	// "What viewers said": the comments under the top TikTok posts by what they say (going,
	// been and agree, disagree, asking), the most asked questions, and one line on what the
	// disagreeing ones say.
	interface Props {
		comments: ReportComments;
	}

	let { comments }: Props = $props();

	const INTENTS: { key: string; label: string; cls: string }[] = [
		{ key: 'intent', label: 'Want to go', cls: 'bg-primary-darker' },
		{ key: 'confirmation', label: 'Been and agree', cls: 'bg-primary' },
		{ key: 'question', label: 'Asking', cls: 'bg-ink/40' },
		{ key: 'disagreement', label: 'Disagree', cls: 'bg-beet' },
		{ key: 'tag', label: 'Tag a friend', cls: 'bg-ink/15' }
	];
	const n = (record: Record<string, number>, key: string) => record[key] ?? 0;
	const disagreements = $derived(comments.posts.filter((p) => p.disagreement));
	const actions = $derived(comments.questions.filter((q) => q.action));
</script>

<div class="mt-8 break-inside-avoid">
	<h3 class="m-0 text-base font-semibold">What viewers said</h3>
	<p class="text-muted-foreground m-0 mt-0.5 mb-3 text-xs">
		{comments.comments} comments under your top {comments.posts.length}
		{comments.posts.length === 1 ? 'TikTok post' : 'TikTok posts'} by others
	</p>

	<ul class="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-5">
		{#each INTENTS as intent (intent.key)}
			<li class="bg-paper border-line rounded-md border px-3 py-2">
				<p class="m-0 flex items-center gap-1.5 text-[11px]">
					<span class="{intent.cls} size-2.5 shrink-0 rounded-sm"></span>
					<span class="text-muted-foreground">{intent.label}</span>
				</p>
				<p class="m-0 mt-0.5 text-xl font-semibold tabular-nums">
					{n(comments.intents, intent.key)}
				</p>
			</li>
		{/each}
	</ul>

	{#if comments.posts.length > 1}
		<ul class="m-0 mt-3 flex list-none flex-col p-0 text-[13px]">
			{#each comments.posts as post (post.postId)}
				<li
					class="border-line grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t py-1.5">
					<a href={post.url} target="_blank" rel="noreferrer" class="text-ink truncate no-underline"
						>@{post.author ?? 'unknown'}
						<span class="text-muted-foreground">· {compact(post.views)} views</span></a>
					<span class="text-muted-foreground tabular-nums">
						{n(post.intents, 'intent')} going · {n(post.intents, 'question')} asking · {n(
							post.intents,
							'disagreement'
						)} disagree
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if comments.questions.length}
		<p class="m-0 mt-4 mb-1.5 text-sm font-semibold">What they asked</p>
		<ol class="m-0 flex list-none flex-col gap-1 p-0">
			{#each comments.questions as question (question.topic)}
				<li class="flex items-baseline gap-3 text-[13px]">
					<span class="w-8 shrink-0 font-semibold tabular-nums">{question.count}×</span>
					<span class="text-reading-ink">“{question.example}”</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#each disagreements as post (post.postId)}
		<p class="text-reading-ink m-0 mt-3 text-[13px]">
			<span class="text-beet font-semibold">Disagreeing</span> under @{post.author ?? 'a creator'}:
			{post.disagreement}
		</p>
	{/each}

	{#each actions as question (question.topic)}
		<p class="bg-tint border-ink/15 m-0 mt-3 rounded-md border px-4 py-2.5 text-[13px]">
			{question.action}
		</p>
	{/each}
</div>
