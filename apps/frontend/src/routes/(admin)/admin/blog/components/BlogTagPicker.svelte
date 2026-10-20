<script lang="ts">
	import { Plus, Search, Tag } from '@lucide/svelte';
	import type { BlogTagOutputDto } from 'client';

	import * as Popover from '#ui/primitives-new/popover/index.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import FieldTrigger from '#ui/wrapped/FieldTrigger.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// Controlled component (value + onChange) so it drops into the form's `custom` field type.
	interface Props {
		// Existing tags, used purely as autocomplete suggestions.
		allTags: BlogTagOutputDto[];
		// The selected tag *names* — the shape the entry create/update endpoints upsert.
		value?: string[];
		onChange?: (value: string[]) => void;
		placeholder?: string;
		disabled?: boolean;
	}

	let {
		allTags,
		value = [],
		onChange,
		placeholder = 'Add tags',
		disabled = false
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	let trimmedQuery = $derived(query.trim());
	let normalizedQuery = $derived(trimmedQuery.toLowerCase());

	let suggestions = $derived(
		allTags.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
	);

	// Offer "create" only when what's typed doesn't already exist (as a tag or a selection).
	let canCreate = $derived(
		trimmedQuery.length > 0 &&
			!allTags.some((t) => t.name.toLowerCase() === normalizedQuery) &&
			!value.some((s) => s.toLowerCase() === normalizedQuery)
	);

	const toggle = (name: string) => {
		onChange?.(value.includes(name) ? value.filter((s) => s !== name) : [...value, name]);
	};

	const remove = (name: string) => {
		onChange?.(value.filter((s) => s !== name));
	};

	const create = () => {
		onChange?.([...value, trimmedQuery]);
		query = '';
	};

	// Enter takes what the list is offering: the new name, or the only match left.
	const onSearchKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		if (canCreate) create();
		else if (suggestions.length === 1) {
			toggle(suggestions[0].name);
			query = '';
		}
	};
</script>

<div class="flex flex-col gap-2">
	{#if value.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each value as name (name)}
				<Badge variant="secondary" close onClose={() => remove(name)}>{name}</Badge>
			{/each}
		</div>
	{/if}

	<Popover.Root bind:open>
		<Popover.Trigger {disabled} class="w-full rounded-md outline-none">
			<FieldTrigger icon={Tag} empty {open} {disabled}>{placeholder}</FieldTrigger>
		</Popover.Trigger>
		<Popover.Content
			align="start"
			class="z-[100] flex max-h-[320px] w-(--bits-popover-anchor-width) min-w-64 flex-col overflow-y-auto p-0">
			<div class="border-line border-b">
				<Input
					class="rounded-none border-0 shadow-none focus-visible:ring-0"
					bind:value={query}
					placeholder="Search or create…"
					icon={Search}
					onkeydown={onSearchKeydown} />
			</div>
			<div class="flex flex-col p-1">
				{#each suggestions as tag (tag.id)}
					<div
						class="hover:bg-tint relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none">
						<Checkbox
							checked={value.includes(tag.name)}
							onCheckedChange={() => toggle(tag.name)}>
							{tag.name}
						</Checkbox>
					</div>
				{/each}

				{#if canCreate}
					<button
						type="button"
						class="hover:bg-tint flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
						onclick={create}>
						<Plus class="h-4 w-4 shrink-0" />
						Create <span class="font-medium">"{trimmedQuery}"</span>
					</button>
				{:else if suggestions.length === 0}
					<div class="flex h-20 w-full items-center justify-center px-3 text-center">
						<span class="text-muted-foreground text-sm">
							{trimmedQuery
								? 'That tag is already on the article.'
								: 'No tags yet. Type a name to create the first one.'}
						</span>
					</div>
				{/if}
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
