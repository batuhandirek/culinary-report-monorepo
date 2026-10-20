<script lang="ts">
	import { Check, Info, TriangleAlert } from '@lucide/svelte';

	import * as Alert from '#ui/primitives-new/alert/index.js';

	interface Props {
		info?: boolean;
		success?: boolean;
		warning?: boolean;
		error?: boolean;
		title?: string | undefined;
		description?: string | undefined;
		class?: string;
	}

	let {
		info = false,
		success = false,
		warning = false,
		error = false,
		title = undefined,
		description = undefined,
		class: className = ''
	}: Props = $props();

	// The state is carried by the ground, not by a coloured hairline: every alert keeps
	// the same ink outline and only the tint underneath changes.
	const tint = $derived(
		error
			? 'bg-destructive/12'
			: warning
				? 'bg-tint'
				: success
					? 'bg-success/15'
					: info
						? 'bg-paper'
						: 'bg-paper'
	);
</script>

<Alert.Root class={['pop rounded-md', tint, className]}>
	{#if info}
		<Info class="h-4 w-4" />
	{/if}
	{#if success}
		<Check class="h-4 w-4" />
	{/if}
	{#if warning || error}
		<TriangleAlert class="h-4 w-4" />
	{/if}
	{#if title}
		<!-- The primitive clamps titles to one line; a Turkish sentence on a phone needs two. -->
		<Alert.Title class="line-clamp-none">
			{title}
		</Alert.Title>
	{/if}
	{#if description}
		<Alert.Description>
			{description}
		</Alert.Description>
	{/if}
</Alert.Root>
