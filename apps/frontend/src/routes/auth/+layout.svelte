<script lang="ts">
	import { ChartLine, MessageSquareText, Store, X } from '@lucide/svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { leaveAuthPath } from '#components/auth/after-auth.js';
	import Logo from '#components/Logo.svelte';
	import { userStore } from '#stores/UserStore.svelte.js';
	import Spinner from '#ui/components/Spinner.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const POINTS = [
		{
			icon: MessageSquareText,
			title: 'Every mention',
			text: 'TikTok, Instagram and Google reviews about your venue, in one place.'
		},
		{
			icon: ChartLine,
			title: 'A monthly report',
			text: 'What guests praised, what they complained about, and what changed.'
		},
		{
			icon: Store,
			title: 'Your neighbourhood',
			text: 'How the places around you are being talked about.'
		}
	];

	const leave = () => goto(leaveAuthPath(page.url), { replace: true });
</script>

<!-- A screen of its own over the page ground: the value panel on wide screens, the form
     as the one calm thing to do. `checker` carries the body's grain onto this ground. -->
<div class="bg-background checker fixed inset-0 z-[1] flex">
	<aside class="bg-tint relative hidden w-[42%] max-w-[640px] flex-col justify-between p-12 lg:flex">
		<Logo width={170} />

		<div class="flex max-w-[440px] flex-col gap-7">
			<div class="flex flex-col gap-4">
				<span class="eyebrow text-beet">Restaurants · bars · cafés</span>
				<p class="type-hero text-ink m-0 text-[2.75rem] leading-[1.05]">
					Know what people
					<span
						class="bg-primary border-ink shadow-stamp inline-block -rotate-2 rounded-md border-2 px-2 pb-1 leading-none"
						>say</span
					> about you.
				</p>
			</div>
			<ul class="m-0 flex list-none flex-col gap-4 p-0">
				{#each POINTS as point, index (point.title)}
					<li class="flex items-start gap-3.5">
						<span
							class="bg-paper border-line text-ink grid size-10 shrink-0 place-items-center rounded-full border">
							<point.icon size={18} />
						</span>
						<span class="flex flex-col gap-0.5">
							<span class="text-ink flex items-center gap-2 text-[0.9375rem] font-semibold">
								<span class="eyebrow text-beet">0{index + 1}</span>
								{point.title}
							</span>
							<span class="text-reading-ink text-sm">{point.text}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>

	</aside>

	<div class="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
		<!-- The wordmark stands in for the hidden panel on a phone; the close key is always
		     in the same corner. -->
		<header class="pt-safe flex shrink-0 items-center justify-between px-4 lg:px-6">
			<div class="flex h-16 items-center lg:invisible">
				<Logo width={150} />
			</div>
			<IconButton label="Kapat" icon={X} variant="ghost" circle lg onclick={leave} />
		</header>

		<main
			class="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pt-4 pb-10 lg:justify-center lg:pt-0 lg:pb-24">
			{#if userStore.triedInitialising}
				{@render children?.()}
			{:else}
				<div class="text-muted-foreground flex flex-1 items-center justify-center">
					<Spinner size={32} />
				</div>
			{/if}
		</main>
	</div>
</div>
