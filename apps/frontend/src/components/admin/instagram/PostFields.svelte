<script lang="ts">
	import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	import ImageField from './ImageField.svelte';
	import { emptyValues, type PostField, type PostValues } from './post-design.js';
	import PostFields from './PostFields.svelte';

	import { Label } from '#ui/primitives-new/label/index.js';
	import { Switch } from '#ui/primitives-new/switch/index.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// A design's form, drawn from its `fields`; a `list` field draws its rows with this same
	// component. Writes straight into `values`, which the preview renders from.
	interface Props {
		fields: PostField[];
		values: PostValues;
		/** Rows of a list are tighter. */
		nested?: boolean;
		/** A list row was focused: the carousel's preview can turn to its slide. */
		onrowfocus?: (key: string, index: number) => void;
	}

	let { fields, values = $bindable(), nested = false, onrowfocus }: Props = $props();
	const uid = nanoid(6);

	const rows = (key: string) => (values[key] as PostValues[] | undefined) ?? [];
	const move = (key: string, from: number, to: number) => {
		const list = [...rows(key)];
		const [row] = list.splice(from, 1);
		list.splice(to, 0, row);
		values[key] = list;
	};
	const text = (key: string) => String(values[key] ?? '');
</script>

<div class={['flex flex-col', nested ? 'gap-3' : 'gap-5']}>
	{#each fields as field (field.key)}
		{@const id = `${uid}-${field.key}`}
		<div class="flex flex-col gap-1.5">
			{#if field.type === 'toggle'}
				<div class="flex items-center justify-between gap-3">
					<Label for={id}>{field.label}</Label>
					<Switch
						{id}
						checked={!!values[field.key]}
						onCheckedChange={(v) => (values[field.key] = v)} />
				</div>
			{:else}
				<div class="flex items-baseline justify-between gap-3">
					<Label for={id}>{field.label}</Label>
					{#if 'maxLength' in field && field.maxLength}
						<span
							class={[
								'font-term text-base leading-none',
								text(field.key).length > field.maxLength * 0.9
									? 'text-beet'
									: 'text-faint'
							]}>
							{text(field.key).length}/{field.maxLength}
						</span>
					{/if}
				</div>
			{/if}

			{#if field.type === 'text'}
				<Input
					{id}
					value={text(field.key)}
					oninput={(e) => (values[field.key] = e.currentTarget.value)}
					placeholder={field.placeholder}
					maxlength={field.maxLength} />
			{:else if field.type === 'textarea'}
				<Textarea
					{id}
					value={text(field.key)}
					oninput={(e) => (values[field.key] = e.currentTarget.value)}
					placeholder={field.placeholder}
					maxlength={field.maxLength}
					rows={2} />
			{:else if field.type === 'number'}
				<Input
					{id}
					type="number"
					value={String(values[field.key] ?? 0)}
					min={field.min}
					max={field.max}
					oninput={(e) => (values[field.key] = e.currentTarget.valueAsNumber || 0)} />
			{:else if field.type === 'select'}
				<Select
					{id}
					items={field.options}
					value={String(values[field.key] ?? '')}
					onValueChange={(v) => (values[field.key] = v)}
					aria-label={field.label} />
			{:else if field.type === 'image'}
				<ImageField
					{id}
					bind:value={() => text(field.key), (v) => (values[field.key] = v)} />
			{:else if field.type === 'list'}
				{@const list = rows(field.key)}
				<div class="flex flex-col gap-2">
					{#each list as row, i (i)}
						<div
							role="group"
							aria-label={`${field.itemLabel} ${i + 1}`}
							class="border-line bg-sand/60 flex flex-col gap-3 rounded-md border p-3"
							onfocusin={() => onrowfocus?.(field.key, i)}>
							<div class="flex items-center gap-1">
								<span class="eyebrow text-beet mr-auto"
									>{field.itemLabel} {i + 1}</span>
								<IconButton
									variant="ghost"
									icon={ArrowUp}
									label="Move up"
									disabled={i === 0}
									onclick={() => move(field.key, i, i - 1)} />
								<IconButton
									variant="ghost"
									icon={ArrowDown}
									label="Move down"
									disabled={i === list.length - 1}
									onclick={() => move(field.key, i, i + 1)} />
								<IconButton
									variant="ghost"
									icon={Trash2}
									label={`Remove ${field.itemLabel.toLowerCase()}`}
									disabled={list.length <= (field.min ?? 0)}
									onclick={() =>
										(values[field.key] = list.filter((_, j) => j !== i))} />
							</div>
							<PostFields
								fields={field.fields}
								bind:values={
									() => row,
									(v) =>
										(values[field.key] = list.map((r, j) => (j === i ? v : r)))
								}
								nested />
						</div>
					{/each}
					{#if list.length < (field.max ?? Infinity)}
						<Button
							size="sm"
							variant="outline"
							icon={Plus}
							class="self-start"
							onclick={() =>
								(values[field.key] = [...list, emptyValues(field.fields)])}>
							Add {field.itemLabel.toLowerCase()}
						</Button>
					{/if}
				</div>
			{/if}

			{#if field.hint}
				<p class="text-muted-foreground m-0 text-xs">{field.hint}</p>
			{/if}
		</div>
	{/each}
</div>
