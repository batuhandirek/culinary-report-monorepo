<script lang="ts">
	import { untrack } from 'svelte';

	import TagsInputTag from './tags-input-tag.svelte';
	import type { TagsInputProps } from './types';

	import { cn } from '#ui/lib/utils.js';

	const defaultValidate: TagsInputProps['validate'] = (val, tags) => {
		const transformed = val.trim();

		// disallow empties
		if (transformed.length === 0) return undefined;

		// disallow duplicates
		if (tags.find((t) => transformed === t)) return undefined;

		return transformed;
	};

	let {
		value = $bindable([]),
		placeholder,
		class: className,
		disabled = false,
		validate = defaultValidate,
		...rest
	}: TagsInputProps = $props();

	let inputValue = $state('');
	let tagIndex = $state<number>();
	let invalid = $state(false);
	let isComposing = $state(false);

	$effect(() => {
		// whenever input value changes reset invalid
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		inputValue;

		untrack(() => {
			invalid = false;
		});
	});

	const enter = () => {
		if (isComposing) return;

		const validated = validate(inputValue, value);

		if (!validated) {
			invalid = true;
			return;
		}

		value = [...value, validated];
		inputValue = '';
	};

	const compositionStart = () => {
		isComposing = true;
	};

	const compositionEnd = () => {
		isComposing = false;
	};

	const keydown = (e: KeyboardEvent) => {
		const target = e.target as HTMLInputElement;

		// Enter and comma both close a tag — a comma is what people type between tags.
		if (e.key === 'Enter' || e.key === ',') {
			// prevent form submit
			e.preventDefault();

			if (isComposing) return;

			enter();
			return;
		}

		const isAtBeginning = target.selectionStart === 0 && target.selectionEnd === 0;

		let shouldResetIndex = true;

		if (e.key === 'Backspace') {
			if (isAtBeginning) {
				e.preventDefault();

				if (tagIndex !== undefined) {
					deleteIndex(tagIndex);

					// focus previous
					const prev = tagIndex - 1;

					if (prev < 0) {
						tagIndex = undefined;
					} else {
						tagIndex = prev;
					}
				} else {
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}
		}

		if (e.key === 'Delete') {
			if (isAtBeginning) {
				if (inputValue.length === 0) {
					if (tagIndex !== undefined) {
						e.preventDefault();

						deleteIndex(tagIndex);

						// stay focused on the same index unless value.length === 0
						if (value.length === 0) tagIndex = undefined;

						shouldResetIndex = false;
					}
				}
			}
		}

		// controls for tag selection
		if (isAtBeginning) {
			// left
			if (e.key === 'ArrowLeft') {
				if (tagIndex !== undefined) {
					const prev = tagIndex - 1;

					if (prev < 0) {
						tagIndex = 0;
					} else {
						tagIndex = prev;
					}
				} else {
					// set initial index
					tagIndex = value.length - 1;
				}

				shouldResetIndex = false;
			}

			// right
			// we can only move right if the value is empty
			if (inputValue.length === 0) {
				if (e.key === 'ArrowRight') {
					if (tagIndex !== undefined) {
						const next = tagIndex + 1;

						if (next > value.length - 1) {
							tagIndex = undefined;
						} else {
							tagIndex = next;
						}

						shouldResetIndex = false;
					}
				}
			}
		}

		// reset the tag index to undefined
		if (shouldResetIndex) {
			tagIndex = undefined;
		}
	};

	const deleteValue = (val: string) => {
		const index = value.findIndex((v) => val === v);

		if (index === -1) return;

		deleteIndex(index);
	};

	const deleteIndex = (index: number) => {
		value = [...value.slice(0, index), ...value.slice(index + 1)];
	};

	const blur = () => {
		tagIndex = undefined;
		// A tag typed but never confirmed would be dropped without a word on save; leaving
		// the field keeps it. An invalid leftover (a duplicate) simply stays in the box.
		if (inputValue.trim().length > 0) enter();
	};
</script>

<!-- The box is the field: same paper ground, height token and focus ring as `Input`, drawn
     on the wrapper because the real `<input>` is only the last cell in it. -->
<div
	class={cn(
		'border-input bg-paper selection:bg-primary dark:bg-input/30 flex min-h-(--field-height) w-full flex-wrap place-items-center gap-1 rounded-md border px-1.5 py-1 transition-[color,box-shadow,border-color]',
		'focus-within:border-ink focus-within:ring-ring/50 focus-within:ring-[3px]',
		'has-[[aria-invalid=true]]:border-destructive aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
		className
	)}
	aria-disabled={disabled}>
	{#each value as tag, i (tag)}
		<TagsInputTag value={tag} {disabled} onDelete={deleteValue} active={i === tagIndex} />
	{/each}
	<input
		{...rest}
		bind:value={inputValue}
		onblur={blur}
		oncompositionstart={compositionStart}
		oncompositionend={compositionEnd}
		{disabled}
		{placeholder}
		data-invalid={invalid}
		onkeydown={keydown}
		class="placeholder:text-faint data-[invalid=true]:text-destructive min-w-16 shrink grow basis-0 border-none bg-transparent px-2 text-sm outline-hidden focus:outline-hidden disabled:cursor-not-allowed" />
</div>
