<script lang="ts" module>
	import type { AdminTopicOutputDto } from 'client';

	import { api } from '#lib/api.js';

	// Every topic, for the pickers: read once per city and shared by every open editor
	// (a plain cache, not state: nothing redraws when it fills; a failed read is forgotten)
	let topicLists: Record<string, Promise<AdminTopicOutputDto[]>> = {};
	const topicsOf = (cityId: string) =>
		(topicLists[cityId] ??= api.admin
			.getTopics({ cityId })
			.then((res) => res.topics)
			.catch((error: unknown) => {
				delete topicLists[cityId];
				throw error;
			}));
	/** After a topic was created or changed elsewhere: the next editor reads the list again */
	export const forgetTopicLists = () => {
		topicLists = {};
	};
</script>

<script lang="ts">
	import { ChevronDown, Plus, X } from '@lucide/svelte';
	import type { AdminChangeTermInputDto, AdminPromoteTermInputDtoKindEnum, AdminTermOutputDto, AdminUpdatedTermOutputDto } from 'client';

	import { defaultEdgeType, edgeLabel, type EdgeType, FOOD_KIND_ITEMS, kindLabel } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import ResponsiveCombobox from '#ui/wrapped/ResponsiveCombobox.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// One wording's decision, edited as the sentence it makes: “vegan döner” is [a kind of]
	// [Döner & kebab], and has [Vegan] [+]. The first pick says how it relates to its topic: the same
	// thing (a spelling, a translation: everything the topic is holds for it), a kind of it (narrower:
	// used enough, a topic of its own), or not food (no topic). A kind of something may also be or
	// have other topics (its modifiers; a click on one flips "is a" and "has"). Save makes it an
	// admin's decision, final for the AI; "Let the AI decide" hands it back to the name match and the
	// agent. "Make it a topic" (folded away) promotes a narrower wording at once, whatever its uses.
	// A wording under an aspect is that aspect: no "kind of", no modifiers, no topic of its own.
	interface Props {
		cityId: string;
		term: AdminTermOutputDto | AdminUpdatedTermOutputDto;
		onSaved: (saved: AdminUpdatedTermOutputDto) => void;
		/** After the wording became a topic of its own: the page's topic lists are stale */
		onPromoted?: (saved: AdminUpdatedTermOutputDto) => void;
	}

	let { cityId, term, onSaved, onPromoted }: Props = $props();

	const NONE = '-';
	let topics = $state<AdminTopicOutputDto[]>([]);
	$effect(() => {
		topicsOf(cityId).then((list) => (topics = list));
	});
	const byKey = $derived(new Map(topics.map((t) => [t.key, t])));

	type How = 'same' | 'kind' | 'none';
	const HOW_ITEMS: { value: How; label: string }[] = [
		{ value: 'same', label: 'the same as' },
		{ value: 'kind', label: 'a kind of' },
		{ value: 'none', label: 'not food' }
	];

	// svelte-ignore state_referenced_locally
	const initial = { how: (!term.topic ? 'none' : term.exact ? 'same' : 'kind') as How, topicKey: term.topic?.key ?? NONE };
	let how = $state<How>(initial.how);
	let topicKey = $state(initial.topicKey);
	// svelte-ignore state_referenced_locally
	let modifiers = $state<{ topicKey: string; type: EdgeType }[]>(term.modifiers.map((m) => ({ topicKey: m.key, type: m.type as EdgeType })));
	let pickingTopic = $state(false);
	let addingOpen = $state(false);

	const labelOf = (key: string) => byKey.get(key)?.label ?? term.modifiers.find((m) => m.key === key)?.label ?? (term.topic?.key === key ? term.topic.label : key);
	const underAspect = $derived(topicKey !== NONE && (byKey.get(topicKey)?.kind ?? term.topic?.kind) === 'aspect');
	// What is saved: an aspect is always the same thing; "not food" has no topic
	const effective = $derived<How>(underAspect ? 'same' : how);
	const narrower = $derived(effective === 'kind' && topicKey !== NONE);

	const topicItems = $derived(
		// Until the list is in, the wording's own topic is the only item
		(topics.length ? topics : term.topic ? [term.topic] : [])
			.slice()
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((t) => ({ value: t.key, label: `${t.label} · ${kindLabel(t.kind)}` }))
	);
	const modifierItems = $derived(
		topics
			.filter((t) => t.kind !== 'aspect' && t.key !== topicKey && !modifiers.some((m) => m.topicKey === t.key))
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((t) => ({ value: t.key, label: `${t.label} · ${kindLabel(t.kind)}` }))
	);
	const pickTopic = (value: string | number | null) => {
		if (typeof value === 'string') topicKey = value;
		pickingTopic = false;
	};
	const addModifier = (value: string | number | null) => {
		const picked = typeof value === 'string' ? byKey.get(value) : undefined;
		if (picked) modifiers = [...modifiers, { topicKey: picked.key, type: defaultEdgeType(picked.kind) }];
		addingOpen = false;
	};
	const flip = (i: number) =>
		(modifiers = modifiers.map((m, k) => (k === i ? { ...m, type: m.type === 'is_a' ? ('has' as const) : ('is_a' as const) } : m)));

	const body = $derived(
		(effective === 'none' || topicKey === NONE
			? { topicKey: null, exact: false, modifiers: [] }
			: { topicKey, exact: effective === 'same', modifiers: narrower ? modifiers : [] }) as AdminChangeTermInputDto
	);
	const ready = $derived(effective === 'none' || topicKey !== NONE);
	const saveAction = createAction(() => api.admin.changeTerm(term.id, body), {
		successNotification: () => ({ title: `"${term.name}" saved`, text: 'Every claim naming it follows at once.' }),
		onSuccess: (saved) => onSaved(saved)
	});
	const autoAction = createAction(() => api.admin.changeTerm(term.id, { auto: true }), {
		successNotification: (saved) => ({
			title: saved.decidedBy ? `"${term.name}" is ${saved.topic?.label ?? 'decided'} by its name` : `"${term.name}" waits for the AI again`
		}),
		onSuccess: (saved) => onSaved(saved)
	});

	// A topic of its own: named as the AI proposed it, else after the wording
	let promoting = $state(false);
	const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
	// svelte-ignore state_referenced_locally
	let newLabel = $state(term.proposedLabel ?? capitalized(term.name));
	// svelte-ignore state_referenced_locally
	let newKind = $state<string>(term.proposedKind ?? 'dish');
	const promoteAction = createAction(
		() => api.admin.promoteTerm(term.id, { label: newLabel.trim(), kind: newKind as AdminPromoteTermInputDtoKindEnum }),
		{
			successNotification: (saved) => ({
				title: `${saved.topic?.label ?? newLabel} is a topic now`,
				text: `"${term.name}" is it, and what the wording was and had are the topic's own relations.`
			}),
			onSuccess: (saved) => {
				forgetTopicLists();
				onSaved(saved);
				onPromoted?.(saved);
			}
		}
	);
	const busy = $derived(saveAction.executing || autoAction.executing || promoteAction.executing);
	const HINTS: Record<How, string> = {
		same: 'A spelling or a translation: everything the topic is and has holds for it.',
		kind: 'Something narrower: it counts for the topic, and used enough it becomes a topic of its own.',
		none: 'Not a food, a drink or an aspect ("plate", a place\'s name): it counts for nothing.'
	};
</script>

<div class="flex flex-col gap-3 p-4 text-sm">
	<!-- The decision as a sentence: “wording” is [how] [topic] -->
	<div class="flex flex-wrap items-center gap-2">
		<span class="font-semibold">“{term.name}” is</span>
		{#if underAspect}
			<span class="text-muted-foreground">about</span>
		{:else}
			<div class="w-32">
				<Select items={HOW_ITEMS} bind:value={how} size="sm" aria-label={`How "${term.name}" relates to its topic`} />
			</div>
		{/if}
	</div>
	{#if effective !== 'none'}
		<ResponsiveCombobox
			items={topicItems}
			selected={topicKey === NONE ? null : topicKey}
			bind:open={pickingTopic}
			onSelect={pickTopic}
			placeholder="Pick a topic"
			title={`Topic of “${term.name}”`}
			class="w-full" />
	{/if}

	{#if narrower}
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-muted-foreground mr-0.5">and also</span>
			{#each modifiers as m, i (m.topicKey)}
				<span class="border-line bg-paper inline-flex h-8 items-center rounded-full border pr-1 pl-1">
					<button
						type="button"
						class="text-muted-foreground hover:text-ink hover:bg-wash h-6 rounded-full px-2 text-xs"
						title="Click to switch between “is a” and “has”"
						onclick={() => flip(i)}>{edgeLabel(m.type)}</button>
					<span class="pr-1">{labelOf(m.topicKey)}</span>
					<button
						type="button"
						class="text-muted-foreground hover:text-ink grid size-6 place-items-center rounded-full"
						aria-label={`Remove ${edgeLabel(m.type)} ${labelOf(m.topicKey)}`}
						onclick={() => (modifiers = modifiers.filter((_, k) => k !== i))}><X class="size-3.5" /></button>
				</span>
			{/each}
			{#if modifiers.length < 5}
				<div class="w-40">
					<ResponsiveCombobox
						items={modifierItems}
						selected={null}
						bind:open={addingOpen}
						onSelect={addModifier}
						placeholder="Add…"
						title="What else it is or has" />
				</div>
			{/if}
		</div>
	{/if}

	<p class="text-muted-foreground m-0 text-xs">{underAspect ? 'A wording under an aspect is that aspect, nothing narrower.' : HINTS[how]}</p>

	<div class="flex flex-wrap items-center gap-2">
		<Button size="sm" loading={saveAction.executing} disabled={busy || !ready} onclick={() => saveAction.execute()}>Save</Button>
		<Button size="sm" variant="ghost" loading={autoAction.executing} disabled={busy} onclick={() => autoAction.execute()}>Let the AI decide</Button>
		{#if !underAspect}
			<button
				type="button"
				class="text-muted-foreground hover:text-ink ml-auto inline-flex h-9 items-center gap-1 text-xs"
				aria-expanded={promoting}
				onclick={() => (promoting = !promoting)}>
				<Plus class="size-3.5" /> Make it a topic <ChevronDown class={['size-3.5 transition-transform', promoting && 'rotate-180']} />
			</button>
		{/if}
	</div>

	{#if promoting && !underAspect}
		<form
			class="bg-wash flex flex-col gap-2 rounded-md p-3"
			onsubmit={(e) => {
				e.preventDefault();
				if (newLabel.trim()) promoteAction.execute();
			}}>
			<p class="text-muted-foreground m-0 text-xs">
				A topic of its own{term.topic && !term.exact ? `, under ${term.topic.label}` : ''}, now, whatever its uses.
			</p>
			<div class="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
				<Input bind:value={newLabel} aria-label="New topic's name" class="h-9" />
				<Select items={FOOD_KIND_ITEMS.map((k) => ({ value: k.value, label: k.label }))} bind:value={newKind} size="sm" aria-label="New topic's type" />
			</div>
			<Button size="sm" variant="outline" type="submit" loading={promoteAction.executing} disabled={busy || !newLabel.trim()}>
				Create the {kindLabel(newKind).toLowerCase()} “{newLabel.trim() || '…'}”
			</Button>
		</form>
	{/if}
</div>
