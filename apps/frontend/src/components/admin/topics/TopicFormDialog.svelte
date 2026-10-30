<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import type {
		AdminCreateTopicInputDto,
		AdminTopicBaseOutputDto,
		AdminUpdateTopicInputDto
	} from 'client';

	import ParentSelect from './ParentSelect.svelte';

	import { api } from '#lib/api.js';
	import { isAspectKind, KIND_ITEMS, type TopicOption } from '#lib/topic-kinds.js';
	import { createForm } from '#ui/components/form/index.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';

	// One dialog for both sides of the topic tree. A kind of food has aliases and its Google
	// Trends search; an aspect (what guests say about a place) has a hint for the agents instead.
	// A parent sits on the same side as its child, a stored topic never crosses sides, and only a
	// child-less aspect under a parent can be deleted (the backend refuses the rest with a 400).
	interface Props {
		/** The topic to edit; none creates one */
		topic?: Pick<AdminTopicBaseOutputDto, 'id' | 'key' | 'label' | 'parentKey' | 'aliases' | 'trendsTopicId' | 'trendsQuery' | 'hint'> & {
			kind: string;
		};
		/** A new topic's label, e.g. an unmapped key */
		label?: string;
		/** A new topic's type, cuisine unless given */
		kind?: string;
		/** Every topic: the parent picker (its own side of the tree) and whether an aspect has children */
		topics: TopicOption[];
		active?: boolean;
		onSaved: (topic: AdminTopicBaseOutputDto) => void;
		/** After a leaf aspect was deleted */
		onDeleted?: () => void;
	}

	let { topic, label = '', kind = 'cuisine', topics, active = $bindable(false), onSaved, onDeleted }: Props = $props();

	// The type picked while the dialog is open decides which fields show, so a change rebuilds the
	// form with what was typed carried over; both are cleared when the dialog closes
	let picked = $state<string | null>(null);
	let carried = $state<Record<string, unknown>>({});
	$effect(() => {
		if (!active) {
			picked = null;
			carried = {};
		}
	});
	const kindValue = $derived(picked ?? topic?.kind ?? kind);
	const aspect = $derived(isAspectKind(kindValue));
	// A stored topic keeps its side: an aspect's type is fixed, a kind of food never becomes an aspect
	const kindLocked = $derived(!!topic && isAspectKind(topic.kind));
	const kindItems = $derived(topic && !isAspectKind(topic.kind) ? KIND_ITEMS.filter((k) => !isAspectKind(k.value)) : KIND_ITEMS);

	const NO_PARENT = '-';
	const parentItems = $derived([
		{ value: NO_PARENT, label: 'None' },
		...topics
			.filter((t) => t.key !== topic?.key && isAspectKind(t.kind) === aspect)
			.map((t) => ({ value: t.key, label: t.label }))
			.sort((a, b) => a.label.localeCompare(b.label))
	]);
	const carriedText = (name: string, saved: string) => (typeof carried[name] === 'string' ? (carried[name] as string) : saved);
	const parentValue = $derived.by(() => {
		const wanted = carriedText('parentKey', topic?.parentKey ?? NO_PARENT);
		return parentItems.some((p) => p.value === wanted) ? wanted : NO_PARENT;
	});

	// Rebuilt from the topic, so the dialog always opens on what is saved
	const form = $derived(
		createForm({
			fields: {
				label: {
					type: 'text' as const,
					label: 'Label',
					placeholder: aspect ? 'Tip prompts' : 'Vietnamese',
					value: carriedText('label', topic?.label ?? label),
					validation: [(v: string) => !!v?.trim() || 'A label is needed'],
					hint: topic
						? `Key "${topic.key}" stays: ${aspect ? 'points are filed under it' : 'stored trends rows carry it'}.`
						: aspect
							? 'Its key is the label, lowercased with underscores ("Tip prompts" → tip_prompts).'
							: 'Its key is the label, lowercased without accents or words like "restaurant".',
					col: 6
				},
				kind: {
					type: 'select' as const,
					label: 'Type',
					items: kindItems,
					value: kindValue,
					disabled: kindLocked,
					hint: kindLocked
						? 'An aspect stays one: points are filed under it.'
						: aspect
							? KIND_ITEMS.find((k) => isAspectKind(k.value))?.hint
							: undefined,
					col: 6
				},
				parentKey: {
					type: 'custom' as const,
					label: 'Belongs to',
					component: ParentSelect,
					props: { items: parentItems },
					value: parentValue,
					hint: aspect
						? 'Its root: the topic its points count under (Waiting for "Wait for a table"). None makes it a root.'
						: 'Its mentions count for the parent too (ramen for Japanese).',
					col: 6
				},
				...(aspect
					? {
							hint: {
								type: 'textarea' as const,
								label: 'What it covers',
								placeholder: 'being asked for a tip, tip screens, service charge added unasked',
								value: carriedText('hint', topic?.hint ?? ''),
								hint: 'Told to the agents filing points: what belongs here, what does not.',
								maxlength: 300,
								counter: true,
								rows: 3,
								optional: true
							}
						}
					: {
							trendsTopicId: {
								type: 'text' as const,
								label: 'Google Trends id',
								placeholder: '/m/07_19',
								value: carriedText('trendsTopicId', topic?.trendsTopicId ?? ''),
								validation: [(v: string) => !v?.trim() || /^\/(m|g)\/[0-9A-Za-z_]+$/.test(v.trim()) || 'Like /m/07_19'],
								hint: 'Find it with "Find a Google Trends id" on the page. Empty: not searched by id.',
								optional: true,
								col: 6
							},
							aliases: {
								type: 'tags' as const,
								label: 'Also called',
								placeholder: 'viet',
								hint: 'Other spellings a post or a Google category uses. A word another topic already has is refused.',
								value: (Array.isArray(carried.aliases) ? carried.aliases : topic?.aliases) ?? []
							},
							trendsQuery: {
								type: 'text' as const,
								label: 'Google Trends search words',
								placeholder: 'biergarten',
								value: carriedText('trendsQuery', topic?.trendsQuery ?? ''),
								hint: 'Only for a topic Google has no id for; searched instead.',
								optional: true
							}
						})
			},
			onChange: (key, value) => {
				if (key !== 'kind' || value === kindValue) return;
				carried = { ...form.values };
				picked = String(value);
			}
		})
	);

	// Only a leaf aspect goes: a kind of food, a root and an aspect with children stay
	const parentLabel = $derived(topics.find((t) => t.key === topic?.parentKey)?.label ?? 'its root');
	const deletable = $derived(
		!!topic && isAspectKind(topic.kind) && !!topic.parentKey && !topics.some((t) => t.parentKey === topic.key)
	);
	const deleteAction = createAction(() => api.admin.deleteTopic(topic!.id), {
		successNotification: () => ({ title: 'Aspect deleted', text: `Its points now count at ${parentLabel}.` }),
		onSuccess: () => {
			active = false;
			onDeleted?.();
		}
	});
	const confirmDelete = () =>
		popConfirmManager.show({
			title: `Delete ${topic?.label}?`,
			description: `The aspect goes from the vocabulary and the points filed under it count at ${parentLabel} instead. This cannot be undone.`,
			confirmText: 'Delete',
			destructive: true,
			onConfirm: () => deleteAction.execute()
		});
</script>

<FormDialog
	bind:active
	{form}
	title={topic ? `Edit ${topic.label}` : aspect ? 'New aspect' : 'New topic'}
	submitText={topic ? 'Save' : 'Create'}
	cancelText="Cancel"
	class="max-w-[640px]"
	onSubmit={async (values) => {
		const v = values as Record<string, unknown>;
		const text = (name: string) => String(v[name] ?? '').trim();
		const label = text('label');
		const parent = String(v.parentKey ?? NO_PARENT);
		const parentKey = parent === NO_PARENT ? null : parent;
		const hint = text('hint');
		const trendsTopicId = text('trendsTopicId');
		const trendsQuery = text('trendsQuery');
		const aliases = (v.aliases as string[] | undefined) ?? [];
		const saved = topic
			? await api.admin.updateTopic(topic.id, {
					label,
					kind: kindValue as AdminUpdateTopicInputDto['kind'],
					parentKey,
					...(aspect
						? { hint: hint || null }
						: { aliases, trendsTopicId: trendsTopicId || null, trendsQuery: trendsQuery || null })
				})
			: await api.admin.createTopic({
					label,
					kind: kindValue as AdminCreateTopicInputDto['kind'],
					...(parentKey && { parentKey }),
					...(aspect
						? { ...(hint && { hint }) }
						: { aliases, ...(trendsTopicId && { trendsTopicId }), ...(trendsQuery && { trendsQuery }) })
				});
		onSaved(saved as AdminTopicBaseOutputDto);
		notificationManager.addNotification({ title: topic ? 'Saved' : aspect ? 'Aspect created' : 'Topic created', success: true });
	}}>
	{#snippet foot()}
		{#if deletable}
			<div class="border-line flex flex-wrap items-center justify-between gap-3 border-t pt-4">
				<p class="text-muted-foreground m-0 text-xs">Nothing sits under it, so it can go; its points then count at {parentLabel}.</p>
				<Button size="sm" variant="outline" icon={Trash2} loading={deleteAction.executing} onclick={confirmDelete}>Delete</Button>
			</div>
		{/if}
	{/snippet}
</FormDialog>
