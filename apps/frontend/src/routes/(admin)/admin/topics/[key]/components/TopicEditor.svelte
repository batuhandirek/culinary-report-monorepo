<script lang="ts">
	import { Search } from '@lucide/svelte';
	import type { AdminTopicOutputDto, AdminTrendsTopicOutputDto, AdminUpdateTopicInputDto, AdminUpdateTopicInputDtoKindEnum } from 'client';

	import TopicEdgesEditor from '#components/admin/topics/TopicEdgesEditor.svelte';
	import { api } from '#lib/api.js';
	import { type EdgeType, FOOD_KIND_ITEMS } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// A kind of food edited in place: label, type, what it is and has (its edges, the first "is a"
	// its parent in the tree) and how Google Trends searches it (a topic id, found here through
	// Trends' own suggestions, else search words). The key stays: stored trends rows carry it.
	interface Props {
		topic: AdminTopicOutputDto;
		topics: AdminTopicOutputDto[];
		onSaved: () => void;
		onCancel: () => void;
	}

	let { topic, topics, onSaved, onCancel }: Props = $props();

	// svelte-ignore state_referenced_locally
	let label = $state(topic.label);
	// svelte-ignore state_referenced_locally
	let kind = $state<string>(topic.kind);
	// svelte-ignore state_referenced_locally
	let edges = $state<{ to: string; type: EdgeType }[]>(topic.edges.map((e) => ({ to: e.to, type: e.type as EdgeType })));
	// svelte-ignore state_referenced_locally
	let trendsTopicId = $state(topic.trendsTopicId ?? '');
	// svelte-ignore state_referenced_locally
	let trendsQuery = $state(topic.trendsQuery ?? '');

	const idValid = $derived(!trendsTopicId.trim() || /^\/(m|g)\/[0-9A-Za-z_]+$/.test(trendsTopicId.trim()));
	const saveAction = createAction(
		() =>
			api.admin.updateTopic(topic.id, {
				label: label.trim(),
				kind: kind as AdminUpdateTopicInputDtoKindEnum,
				edges: edges as AdminUpdateTopicInputDto['edges'],
				trendsTopicId: trendsTopicId.trim() || null,
				trendsQuery: trendsQuery.trim() || null
			}),
		{
			successNotification: () => ({ title: 'Saved', text: 'Everything stored against topics is re-linked in the background.' }),
			onSuccess: () => onSaved()
		}
	);

	// Google Trends' own suggestions for some words: an id is one meaning in every language
	// svelte-ignore state_referenced_locally
	let lookup = $state(topic.label);
	let found = $state<AdminTrendsTopicOutputDto[] | null>(null);
	const lookupAction = createAction(() => api.admin.lookupTrendsTopics({ q: lookup.trim() }), {
		onSuccess: (res) => (found = res.topics)
	});
</script>

<form
	class="flex flex-col gap-3"
	onsubmit={(e) => {
		e.preventDefault();
		if (label.trim() && idValid) saveAction.execute();
	}}>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Label</span>
			<Input bind:value={label} aria-label="Label" class="h-9" />
			<span class="text-muted-foreground text-xs">Key "{topic.key}" stays: stored trends rows carry it.</span>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Type</span>
			<Select items={FOOD_KIND_ITEMS.map((k) => ({ value: k.value, label: k.label }))} bind:value={kind} size="sm" aria-label="Type" />
		</label>
	</div>
	<div class="flex min-w-0 flex-col gap-1 text-sm">
		<span class="text-muted-foreground text-xs">What it is</span>
		<TopicEdgesEditor selfKey={topic.key} {topics} bind:edges />
	</div>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Google Trends id</span>
			<Input bind:value={trendsTopicId} placeholder="/m/07_19" aria-label="Google Trends id" class="h-9" aria-invalid={!idValid} />
			<span class="text-muted-foreground text-xs">{idValid ? 'Searched by this id; empty: not searched by id.' : 'Like /m/07_19'}</span>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Google Trends search words</span>
			<Input bind:value={trendsQuery} placeholder="biergarten" aria-label="Google Trends search words" class="h-9" />
			<span class="text-muted-foreground text-xs">Only for a topic Google has no id for: searched instead.</span>
		</label>
	</div>
	<div class="bg-tint rounded-md p-3">
		<p class="text-muted-foreground m-0 mb-2 text-xs">Find an id: Google Trends' own suggestions for some words (free).</p>
		<div class="flex flex-wrap items-center gap-2">
			<div class="w-56"><Input bind:value={lookup} icon={Search} aria-label="Words to look up" class="h-9" /></div>
			<Button size="sm" variant="outline" loading={lookupAction.executing} disabled={lookup.trim().length < 2} onclick={() => lookupAction.execute()}>
				Look up
			</Button>
		</div>
		{#if found}
			{#if !found.length}
				<p class="text-muted-foreground m-0 mt-2 text-sm">Google suggests nothing for these words.</p>
			{:else}
				<ul class="m-0 mt-2 list-none p-0 text-sm">
					{#each found as t (t.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 border-t py-1">
							<span>{t.title} <span class="text-muted-foreground text-xs">· {t.type} · {t.id}</span></span>
							<Button size="sm" variant="ghost" onclick={() => (trendsTopicId = t.id)}>Use</Button>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<Button size="sm" type="submit" loading={saveAction.executing} disabled={!label.trim() || !idValid}>Save</Button>
		<Button size="sm" variant="ghost" onclick={onCancel}>Cancel</Button>
	</div>
</form>
