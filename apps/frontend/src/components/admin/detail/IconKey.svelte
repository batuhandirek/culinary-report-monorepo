<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { cn } from '#ui/lib/utils.js';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	// A detail page's header key: only its icon, what it is in a hover tooltip ("Website ·
	// citychicken.de", "+49 30 …"). A link opens (a new tab unless `internal`); a plain value
	// (`copy`: a phone number, an address) is copied on click; anything else is a quiet action.
	// The row stays short and the one primary action stands out.
	interface Props {
		icon?: Component;
		/** Drawn instead of `icon` (a platform's glyph) */
		glyph?: Snippet;
		/** What it is or does: the accessible name and the tooltip */
		label: string;
		href?: string;
		internal?: boolean;
		/** A value to copy on click, said in the tooltip */
		copy?: string;
		onclick?: () => void;
		disabled?: boolean;
		class?: string;
	}

	let { icon: Icon, glyph, label, href, internal = false, copy, onclick, disabled = false, class: className = '' }: Props =
		$props();

	const KEY =
		'border-line bg-paper text-ink inline-grid size-[30px] cursor-pointer place-items-center rounded-md border hover:bg-white hover:no-underline focus-visible:bg-white disabled:cursor-default disabled:opacity-50';

	const copyIt = async () => {
		try {
			await navigator.clipboard.writeText(copy!);
			notificationManager.addNotification({ title: 'Copied', text: copy, success: true });
		} catch {
			notificationManager.addNotification({ title: "Couldn't copy it", text: copy });
		}
	};
</script>

{#snippet face()}
	{#if glyph}{@render glyph()}{:else if Icon}<Icon class="size-[15px]" strokeWidth={1.8} />{/if}
{/snippet}

<Tooltip text={copy ? `${label} · click to copy` : label}>
	{#if href}
		<a {href} target={internal ? undefined : '_blank'} rel={internal ? undefined : 'noreferrer'} aria-label={label} class={cn(KEY, className)}
			>{@render face()}</a>
	{:else}
		<button
			type="button"
			aria-label={copy ? `Copy ${label}` : label}
			onclick={copy ? copyIt : onclick}
			{disabled}
			class={cn(KEY, className)}>{@render face()}</button>
	{/if}
</Tooltip>
