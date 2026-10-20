<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';

	let { ...restProps }: SonnerProps = $props();
</script>

<!--
	Every toast is the same paper sticker — one ink outline, no per-type colour. These vars
	are only sonner's fallbacks; the actual treatment (3px outline, hard 6px offset,
	the type roles) lives in the `[data-sonner-toast]` block in `app.css`, because sonner
	ships unlayered global CSS that would beat any Tailwind utility we passed through
	`toastOptions.classes`.
-->
<Sonner
	theme="light"
	class="toaster group"
	style="--normal-bg: var(--card); --normal-text: var(--ink); --normal-border: var(--ink); --border-radius: 14px;"
	{...restProps} />
