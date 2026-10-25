<script lang="ts">
	import type { Snippet } from 'svelte';

	import Logo from '#components/Logo.svelte';

	// The confirm and unsubscribe pages: the wordmark, a stamp, a headline, a line, an action.
	interface Props {
		stamp: string;
		title: string;
		children: Snippet;
	}

	let { stamp, title, children }: Props = $props();
</script>

<main class="bg-sand text-ink flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-16">
	<Logo width={200} />
	<div class="border-ink bg-paper flex w-full max-w-[560px] flex-col gap-5 border-4 p-7 shadow-[8px_8px_0_var(--ink)] md:p-10">
		<span class="stamp text-beet">{stamp}</span>
		<h1 class="font-display m-0 text-[clamp(36px,6vw,56px)] leading-[0.9] font-extrabold tracking-[-0.04em]">{title}</h1>
		{@render children()}
	</div>
</main>
