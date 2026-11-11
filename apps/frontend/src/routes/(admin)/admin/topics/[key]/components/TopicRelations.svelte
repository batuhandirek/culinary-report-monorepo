<script lang="ts">
	import { ArrowDown, ArrowUp, Tag, Tags } from '@lucide/svelte';
	import type { AdminTopicOutputDto } from 'client';
	import type { Component } from 'svelte';

	import { topicHref } from '#lib/topic-format.js';
	import { DECIDED_LABELS } from '#lib/topic-kinds.js';

	// A kind of food's place in the graph, both ways, as one quiet line under its heading: an icon
	// per relation and the names, what each means in its tooltip. Up: what it is (the first is its
	// parent in the tree, in bold) and what it has, which it counts for. Down: the kinds of it and
	// what has it, which count for it. Edited under Edit.
	interface Props {
		topic: AdminTopicOutputDto;
		topics: AdminTopicOutputDto[];
	}

	let { topic, topics }: Props = $props();

	/** Names shown per relation before "+N" */
	const SHOWN = 6;

	const byKey = $derived(new Map(topics.map((t) => [t.key, t])));
	const out = (type: string) =>
		topic.edges.filter((e) => e.type === type).map((e) => ({ key: e.to, by: e.decidedBy as string | undefined }));
	const into = (type: string) =>
		topics
			.filter((t) => t.edges.some((e) => e.to === topic.key && e.type === type))
			.sort((a, b) => b.terms - a.terms || a.label.localeCompare(b.label))
			.map((t) => ({ key: t.key, by: undefined as string | undefined }));

	interface Group {
		label: string;
		hint: string;
		icon: Component;
		items: { key: string; by?: string }[];
		/** The first is its parent in the tree */
		parent?: boolean;
	}
	const groups = $derived<Group[]>(
		[
			{ label: 'Is a', hint: 'Is a: it counts for each, always', icon: ArrowUp, items: out('is_a'), parent: true },
			{ label: 'Has', hint: 'Has: it counts for each in broad counts', icon: Tag, items: out('has') },
			{ label: 'Kinds of it', hint: 'Kinds of it: each counts for it, always', icon: ArrowDown, items: into('is_a') },
			{ label: 'Have it', hint: 'Have it: each counts for it in broad counts', icon: Tags, items: into('has') }
		].filter((g) => g.items.length)
	);
	const title = (g: Group, item: { key: string; by?: string }, i: number) =>
		[
			g.parent && i === 0 ? 'its parent in the tree' : undefined,
			item.by ? `stated by ${DECIDED_LABELS[item.by] ?? item.by}` : undefined
		]
			.filter(Boolean)
			.join(', ') || undefined;
</script>

{#if groups.length}
	<ul class="text-muted-foreground m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-1.5 p-0 text-sm">
		{#each groups as g (g.label)}
			{@const Icon = g.icon}
			<li class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1" title={g.hint}>
				<Icon class="size-3.5 shrink-0" aria-hidden="true" />
				<span class="sr-only">{g.label}:</span>
				{#each g.items.slice(0, SHOWN) as item, i (item.key)}
					<span class="whitespace-nowrap"
						><a
							class={['text-ink decoration-line hover:decoration-ink underline underline-offset-4', g.parent && i === 0 && 'font-semibold']}
							href={topicHref(item.key)}
							title={title(g, item, i)}>{byKey.get(item.key)?.label ?? item.key}</a
						>{#if i < Math.min(g.items.length, SHOWN) - 1}<span aria-hidden="true">,</span>{/if}</span
					>
				{/each}
				{#if g.items.length > SHOWN}<span>+{g.items.length - SHOWN}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}
