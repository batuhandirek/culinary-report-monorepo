<script lang="ts" generics="T">
	import _ from 'lodash';
	import { nanoid } from 'nanoid';

	import { type Component } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';
	import Input from '#ui/primitives-new/input/input.svelte';
	import type { ValueFormatter } from '#ui/wrapped/formatted-input/types.js';

	export interface FormattedInputProps<T> extends Omit<HTMLInputAttributes, 'files' | 'value'> {
		value?: T;
		formatter: ValueFormatter<T>;
		id?: string;
		placeholder?: string;
		icon?: Component;
		type?: string;
		onInput?: (v?: T) => void;
		onChange?: (v?: T) => void;
		class?: string;
	}

	let {
		value = $bindable(),
		formatter,
		id = nanoid(),
		placeholder = '',
		icon = undefined,
		type = 'text',
		onChange,
		onInput,
		class: className = '',
		...restProps
	}: FormattedInputProps<T> = $props();

	let inputRef = $state<HTMLInputElement | null>(null);
	let internalDisplayValue = $state('');
	let isInternalUpdate = $state(false);

	// Derive display value from the actual value prop
	let displayValue = $derived.by(() => {
		if (isInternalUpdate) {
			return internalDisplayValue;
		}
		return value != null && value !== '' ? formatter.format(value) : '';
	});

	function handleInput(e: Event) {
		if (!inputRef) return;

		const target = e.target as HTMLInputElement;
		const cursorPosition = target.selectionStart ?? 0;
		const inputValue = target.value;

		// Parse display string to actual value
		const parsedValue = formatter.parse(inputValue);

		// Check if parsing failed or validation failed
		const isValid =
			parsedValue != null && (formatter.validate ? formatter.validate(parsedValue) : true);

		if (!isValid) {
			// Revert to last valid formatted value
			isInternalUpdate = true;
			internalDisplayValue = displayValue;
			target.value = displayValue;

			// Restore cursor position
			requestAnimationFrame(() => {
				target.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
			});

			// Reset flag after DOM update
			requestAnimationFrame(() => {
				isInternalUpdate = false;
			});
			return;
		}

		// Update with valid value
		const formattedNewValue = formatter.format(parsedValue);
		isInternalUpdate = true;
		internalDisplayValue = formattedNewValue;
		value = parsedValue;

		// Preserve cursor position after formatting
		const lengthDiff = formattedNewValue.length - inputValue.length;
		const newCursorPos = Math.max(0, cursorPosition + lengthDiff);

		requestAnimationFrame(() => {
			if (target === document.activeElement) {
				target.setSelectionRange(newCursorPos, newCursorPos);
			}
			// Reset flag after DOM update
			isInternalUpdate = false;
		});

		onInput?.(parsedValue);
	}

	function handleChange() {
		onChange?.(value);
	}

	function handleBlur() {
		// Ensure display is formatted correctly on blur
		isInternalUpdate = false;
		if (value != null && value !== '' && inputRef) {
			inputRef.value = formatter.format(value);
		}
	}
</script>

<div class="relative flex w-full items-center">
	{#if icon}
		<Icon
			{icon}
			size={16}
			strokeWidth={1.8}
			class="text-muted-foreground pointer-events-none absolute left-3.5" />
	{/if}
	<Input
		bind:ref={inputRef}
		{id}
		{type}
		{placeholder}
		value={displayValue}
		onchange={handleChange}
		oninput={handleInput}
		onblur={handleBlur}
		class={cn('w-full', className, icon && '!pl-10')}
		{..._.omit(restProps, 'class', 'onchange', 'oninput', 'onblur')} />
</div>
