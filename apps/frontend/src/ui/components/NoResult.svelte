<script lang="ts">
	import { SearchX } from '@lucide/svelte';
	import type { Component, Snippet } from 'svelte';

	import EmptyState from '#ui/wrapped/EmptyState.svelte';

	/**
	 * The "a search or a list came back with nothing" preset of `EmptyState`. New code
	 * that needs a title, a hint and an action should reach for `EmptyState` itself.
	 */
	interface Props {
		icon?: Component;
		description?: string;
		/** A quieter line under the description. */
		hint?: string;
		sm?: boolean;
		class?: string;
		children?: Snippet;
		[key: string]: unknown;
	}

	let {
		icon = SearchX,
		description = 'Sonuç bulunamadı',
		hint,
		sm = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props();
</script>

<EmptyState
	{icon}
	title={description}
	{hint}
	size={sm ? 'sm' : 'md'}
	class={className}
	{children}
	{...restProps} />
