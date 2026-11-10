<script lang="ts">
	import { Trash2 } from '@lucide/svelte';

	import { AdminCreateTopicInputDtoKindEnum } from 'client';

	import { api } from '#lib/api.js';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// An aspect edited in place, or a new one under a root: its label, its root and its hint, the
	// hint being exactly what the claim labeller (Jev) is told. The key never changes. Only a leaf
	// under a root can be deleted: its claims then count at the root (`TopicService.remove`, by
	// SQL, no relabelling). A root keeps its place: the readers group by the nine roots.
	interface Props {
		/** The aspect to edit; none creates one under `root` */
		aspect?: { id: string; key: string; label: string; parentKey?: string; hint?: string };
		/** A new aspect's root */
		root?: string;
		roots: { key: string; label: string }[];
		/** It has aspects under it, so it can't be deleted */
		hasChildren?: boolean;
		onSaved: (key: string) => void;
		onDeleted?: () => void;
		onCancel: () => void;
	}

	let { aspect, root, roots, hasChildren = false, onSaved, onDeleted, onCancel }: Props = $props();

	const HINT_MAX = 300;
	// The editor is mounted per edit, so the saved values seed it once
	// svelte-ignore state_referenced_locally
	let label = $state(aspect?.label ?? '');
	// svelte-ignore state_referenced_locally
	let hint = $state(aspect?.hint ?? '');
	// svelte-ignore state_referenced_locally
	let parentKey = $state(aspect?.parentKey ?? root ?? '');
	const isRoot = $derived(!!aspect && !aspect.parentKey);
	const rootLabel = $derived(roots.find((r) => r.key === (aspect?.parentKey ?? root))?.label ?? 'its root');

	const saveAction = createAction(
		() =>
			aspect
				? api.admin.updateTopic(aspect.id, {
						label: label.trim(),
						hint: hint.trim() || null,
						...(!isRoot && parentKey && { parentKey })
					})
				: api.admin.createTopic({ label: label.trim(), kind: AdminCreateTopicInputDtoKindEnum.Aspect, parentKey, ...(hint.trim() && { hint: hint.trim() }) }),
		{
			successNotification: () => ({
				title: aspect ? 'Saved' : 'Aspect created',
				text: 'Claims labelled from now on see it this way; stored claims keep their labels until they are labelled again.'
			}),
			onSuccess: (saved) => onSaved(saved.key)
		}
	);

	const deletable = $derived(!!aspect && !isRoot && !hasChildren);
	const deleteAction = createAction(() => api.admin.deleteTopic(aspect!.id), {
		successNotification: () => ({ title: 'Aspect deleted', text: `Its claims now count at ${rootLabel}.` }),
		onSuccess: () => onDeleted?.()
	});
	const confirmDelete = () =>
		popConfirmManager.show({
			title: `Delete ${aspect?.label}?`,
			description: `It goes from what the labeller is offered, and every claim filed under it counts at ${rootLabel} instead. Nothing is relabelled and nothing is paid. This cannot be undone.`,
			confirmText: 'Delete',
			destructive: true,
			onConfirm: () => deleteAction.execute()
		});
</script>

<form
	class="bg-tint flex flex-col gap-3 rounded-md p-3"
	onsubmit={(e) => {
		e.preventDefault();
		if (label.trim()) saveAction.execute();
	}}>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
		<label class="flex min-w-0 flex-col gap-1 text-sm">
			<span class="text-muted-foreground text-xs">Label</span>
			<Input bind:value={label} placeholder="Tip prompts" aria-label="Label" class="h-9" />
			<span class="text-muted-foreground text-xs">
				{aspect ? `Key "${aspect.key}" stays: claims are filed under it.` : 'Its key is the label in lowercase with underscores ("Tip prompts" → tip_prompts).'}
			</span>
		</label>
		{#if !isRoot}
			<label class="flex min-w-0 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Under</span>
				<Select items={roots.map((r) => ({ value: r.key, label: r.label }))} bind:value={parentKey} size="sm" aria-label="Root" />
			</label>
		{/if}
	</div>
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-muted-foreground text-xs">What it covers: told to the claim labeller word for word</span>
		<Textarea bind:value={hint} maxlength={HINT_MAX} rows={3} placeholder="being asked for a tip, tip screens, service charge added unasked" />
		<span class="text-muted-foreground text-xs">
			Say what belongs here and what does not where a word is shared with another aspect ("a room too hot is
			atmosphere"). {hint.length}/{HINT_MAX}
		</span>
	</label>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<Button size="sm" type="submit" loading={saveAction.executing} disabled={!label.trim()}>{aspect ? 'Save' : 'Add aspect'}</Button>
			<Button size="sm" variant="ghost" onclick={onCancel}>Cancel</Button>
		</div>
		{#if deletable}
			<Button size="sm" variant="outline" icon={Trash2} loading={deleteAction.executing} onclick={confirmDelete}>Delete</Button>
		{:else if aspect && !isRoot && hasChildren}
			<span class="text-muted-foreground text-xs">Aspects sit under it, so it stays.</span>
		{/if}
	</div>
</form>
