<script lang="ts">
	import type { AdminCreateTopicInputDto, AdminCreateTopicInputDtoKindEnum, AdminTopicOutputDto } from 'client';

	import TopicEdgesEditor from '#components/admin/topics/TopicEdgesEditor.svelte';
	import { api } from '#lib/api.js';
	import { type EdgeType, FOOD_KIND_ITEMS } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// A new kind of food or drink: its label, type and what it is and has (its edges, the first "is
	// a" its parent in the tree). Its key is made from the label and never changes (409 names the
	// topic that has it: "Coffee" is the café's "cafe"); the Trends fields are set on its page.
	// Narrower wordings proposed under this label move onto it when the re-link runs.
	interface Props {
		topics: AdminTopicOutputDto[];
		label?: string;
		kind?: string;
		onCreated: (key: string) => void;
		onCancel: () => void;
	}

	let { topics, label: initialLabel = '', kind: initialKind = 'cuisine', onCreated, onCancel }: Props = $props();

	// svelte-ignore state_referenced_locally
	let label = $state(initialLabel);
	// svelte-ignore state_referenced_locally
	let kind = $state(FOOD_KIND_ITEMS.some((k) => k.value === initialKind) ? initialKind : 'cuisine');
	let edges = $state<{ to: string; type: EdgeType }[]>([]);

	const createAction_ = createAction(
		() =>
			api.admin.createTopic({
				label: label.trim(),
				kind: kind as AdminCreateTopicInputDtoKindEnum,
				edges: edges as AdminCreateTopicInputDto['edges']
			}),
		{
			successNotification: () => ({ title: 'Topic created', text: 'Wordings that name it take it when the re-link runs.' }),
			onSuccess: (saved) => onCreated(saved.key)
		}
	);
</script>

<form
	class="bg-tint flex flex-col gap-3 rounded-md p-3"
	onsubmit={(e) => {
		e.preventDefault();
		if (label.trim()) createAction_.execute();
	}}>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Label</span>
			<Input bind:value={label} placeholder="Vietnamese" aria-label="Label" class="h-9" />
			<span class="text-muted-foreground text-xs">Its key is the label, lowercased without accents or words like "restaurant".</span>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Type</span>
			<Select items={FOOD_KIND_ITEMS.map((k) => ({ value: k.value, label: k.label }))} bind:value={kind} size="sm" aria-label="Type" />
		</label>
	</div>
	<div class="flex min-w-0 flex-col gap-1 text-sm">
		<span class="text-muted-foreground text-xs">What it is</span>
		<TopicEdgesEditor {topics} bind:edges />
	</div>
	<div class="flex items-center gap-2">
		<Button size="sm" type="submit" loading={createAction_.executing} disabled={!label.trim()}>Create</Button>
		<Button size="sm" variant="ghost" onclick={onCancel}>Cancel</Button>
	</div>
</form>
