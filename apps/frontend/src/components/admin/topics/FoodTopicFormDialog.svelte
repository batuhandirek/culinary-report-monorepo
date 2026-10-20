<script lang="ts">
	import type {
		AdminCreateFoodTopicInputDto,
		AdminFoodTopicBaseOutputDto,
		AdminUpdateFoodTopicInputDto
	} from 'client';

	import { KIND_ITEMS } from '#lib/food-topic-kinds.js';

	import ParentSelect from './ParentSelect.svelte';

	import { api } from '#lib/api.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { notificationManager } from '#ui/lib/notification-manager.js';

	interface Props {
		/** The topic to edit; none creates one */
		topic?: Pick<AdminFoodTopicBaseOutputDto, 'id' | 'key' | 'label' | 'parentKey' | 'aliases' | 'trendsTopicId' | 'trendsQuery'> & {
			kind: string;
		};
		/** A new topic's label, e.g. an unmapped key */
		label?: string;
		/** Every topic, for the parent picker */
		topics: { key: string; label: string }[];
		active?: boolean;
		onSaved: (topic: AdminFoodTopicBaseOutputDto) => void;
	}

	let { topic, label = '', topics, active = $bindable(false), onSaved }: Props = $props();

	const NO_PARENT = '-';
	const parentItems = $derived([
		{ value: NO_PARENT, label: 'None' },
		...topics
			.filter((t) => t.key !== topic?.key)
			.map((t) => ({ value: t.key, label: t.label }))
			.sort((a, b) => a.label.localeCompare(b.label))
	]);

	// Rebuilt from the topic, so the dialog always opens on what is saved
	const form = $derived({
		fields: {
			label: {
				type: 'text' as const,
				label: 'Label',
				placeholder: 'Vietnamese',
				value: topic?.label ?? label,
				validation: [(v: string) => !!v?.trim() || 'A label is needed'],
				hint: topic
					? `Key "${topic.key}" stays: stored trends rows carry it.`
					: 'Its key is the label, lowercased without accents or words like "restaurant".',
				col: 6
			},
			kind: {
				type: 'select' as const,
				label: 'Type',
				items: KIND_ITEMS,
				value: topic?.kind ?? 'cuisine',
				col: 6
			},
			parentKey: {
				type: 'custom' as const,
				label: 'Belongs to',
				component: ParentSelect,
				props: { items: parentItems },
				value: topic?.parentKey ?? NO_PARENT,
				hint: 'Its mentions count for the parent too (ramen for Japanese).',
				col: 6
			},
			trendsTopicId: {
				type: 'text' as const,
				label: 'Google Trends id',
				placeholder: '/m/07_19',
				value: topic?.trendsTopicId ?? '',
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
				value: topic?.aliases ?? []
			},
			trendsQuery: {
				type: 'text' as const,
				label: 'Google Trends search words',
				placeholder: 'biergarten',
				value: topic?.trendsQuery ?? '',
				hint: 'Only for a topic Google has no id for; searched instead.',
				optional: true
			}
		}
	});
</script>

<FormDialog
	bind:active
	{form}
	title={topic ? `Edit ${topic.label}` : 'New topic'}
	submitText={topic ? 'Save' : 'Create'}
	cancelText="Cancel"
	class="max-w-[640px]"
	onSubmit={async (values) => {
		const v = values as Record<string, unknown>;
		const parent = String(v.parentKey ?? NO_PARENT);
		const body = {
			label: String(v.label).trim(),
			aliases: v.aliases as string[],
			trendsTopicId: String(v.trendsTopicId ?? '').trim() || null,
			trendsQuery: String(v.trendsQuery ?? '').trim() || null
		};
		const saved = topic
			? await api.admin.updateFoodTopic(topic.id, {
					...body,
					kind: v.kind as AdminUpdateFoodTopicInputDto['kind'],
					parentKey: parent === NO_PARENT ? null : parent
				})
			: await api.admin.createFoodTopic({
					...body,
					kind: v.kind as AdminCreateFoodTopicInputDto['kind'],
					trendsTopicId: body.trendsTopicId ?? undefined,
					trendsQuery: body.trendsQuery ?? undefined,
					...(parent !== NO_PARENT && { parentKey: parent })
				});
		onSaved(saved as AdminFoodTopicBaseOutputDto);
		notificationManager.addNotification({ title: topic ? 'Saved' : 'Topic created', success: true });
	}} />
