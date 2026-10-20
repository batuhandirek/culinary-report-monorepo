<script lang="ts">
	import { CircleAlert } from '@lucide/svelte';
	import type { Component } from 'svelte';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';

	/**
	 * The failed-load preset of `ErrorState`. Pass `onRetry` wherever the load can simply
	 * be run again — an error with no way out is a dead end.
	 */
	interface Props {
		icon?: Component;
		description?: string;
		/** A quieter line under the description. */
		hint?: string;
		sm?: boolean;
		onRetry?: () => unknown;
		retryText?: string;
		class?: string;
		[key: string]: unknown;
	}

	const labels = getUiLabels();

	let {
		icon = CircleAlert,
		description = labels.loadFailed,
		hint,
		sm = false,
		onRetry,
		retryText,
		class: className = '',
		...restProps
	}: Props = $props();
</script>

<ErrorState
	{icon}
	title={description}
	{hint}
	{onRetry}
	{retryText}
	size={sm ? 'sm' : 'md'}
	class={className}
	{...restProps} />
