<script lang="ts">
	import { Check, type IconNode } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import Icon from '#ui/components/Icon.svelte';
	import { cn } from '#ui/lib/utils.js';
	import { Spinner } from '#ui/primitives-new/spinner/index.js';
	import Switch from '#ui/primitives-new/switch/switch.svelte';

	/**
	 * One on/off setting as a row: what it is, a sentence on what it does, and the switch.
	 * The whole row is the label, so a tap anywhere on it flips the switch. Put several in
	 * `<Panel rows>`. The row only reports the change: it shows whatever `checked` says, so
	 * a refused save falls back by itself. Each switch saves on its own — `loading` while
	 * the request is out, `saved` for a moment after — so the page needs no "Kaydet".
	 */
	interface Props {
		title: string;
		/** What turning it on means, in one sentence. */
		hint?: string;
		icon?: Component | IconNode;
		checked: boolean;
		onChange: (checked: boolean) => void;
		/** A save is in flight: shows a spinner and holds the switch. */
		loading?: boolean;
		/** The save just went through: a tick beside the switch, for as long as this is set. */
		saved?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		title,
		hint,
		icon,
		checked,
		onChange,
		loading = false,
		saved = false,
		disabled = false,
		class: className = ''
	}: Props = $props();

	const id = $props.id();
</script>

<label
	for={`${id}-switch`}
	class={cn(
		'text-ink flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-3 text-[0.9375rem]',
		disabled ? 'opacity-50' : 'hover:bg-wash/60 cursor-pointer transition-colors',
		className
	)}
>
	{#if icon}
		<Icon {icon} size={19} class="text-muted-foreground shrink-0" />
	{/if}
	<span class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="leading-snug break-words">{title}</span>
		{#if hint}
			<span id={`${id}-hint`} class="text-muted-foreground text-sm leading-snug text-pretty">
				{hint}
			</span>
		{/if}
	</span>
	{#if loading}
		<Spinner class="text-muted-foreground size-4 shrink-0" />
	{:else if saved}
		<span role="status" class="text-success flex shrink-0 items-center">
			<Icon icon={Check} size={16} />
			<span class="sr-only">Kaydedildi</span>
		</span>
	{/if}
	<!-- Controlled: the switch always shows `checked`, and a flip only asks for a change. -->
	<Switch
		id={`${id}-switch`}
		bind:checked={() => checked, (value) => onChange(value)}
		disabled={disabled || loading}
		aria-describedby={hint ? `${id}-hint` : undefined}
	/>
</label>
