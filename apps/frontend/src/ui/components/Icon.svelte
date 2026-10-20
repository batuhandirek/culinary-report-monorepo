<script lang="ts">
	import type { IconNode } from '@lucide/svelte';
	import { Icon } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { ClassValue } from 'tailwind-variants';

	import { cn } from '#ui/lib/utils.js';

	interface Props {
		icon: Component | IconNode;
		size?: number;
		strokeWidth?: number;
		class?: ClassValue;
		style?: string;
	}

	let { icon, style = '', size = 16, strokeWidth = 1.4, class: className }: Props = $props();
	const SvelteComponent = $derived(icon);
</script>

{#if typeof SvelteComponent === 'function'}
	<SvelteComponent
		{strokeWidth}
		class={cn(className)}
		style={`width: ${size}px; height: ${size}px; ${style}`} />
{:else}
	<Icon
		iconNode={icon as IconNode}
		{strokeWidth}
		class={cn(className)}
		style={`width: ${size}px; height: ${size}px; ${style}`} />
{/if}
