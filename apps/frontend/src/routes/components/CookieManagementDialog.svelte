<script lang="ts">
	import { browser } from '$app/env';
	import { type ConsentKeys, analyticsStore } from '#stores/AnalyticsStore.svelte.js';
	import Switch from '#ui/primitives-new/switch/switch.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import ResponsiveModal from '#ui/wrapped/ResponsiveModal.svelte';

	interface Props {
		active?: boolean;
	}

	let { active = $bindable(false) }: Props = $props();

	interface CookieType {
		name: string;
		description: string;
		/** Absent for the cookies the site cannot run without: shown, never switchable. */
		key?: ConsentKeys;
	}
	const COOKIE_TYPES: CookieType[] = [
		{
			name: 'Gerekli',
			description: 'Oturumun ve güvenliğin için. Bunlar olmadan site çalışmaz.'
		},
		{
			name: 'Analitik',
			description: 'Hangi sayfaların işe yaradığını görüp deneyimi iyileştirmemize yardım eder.',
			key: 'hasAcceptedMarketing'
		}
	];

	// The switches are a draft: nothing is stored until one of the buttons is pressed, so
	// closing the dialog leaves the previous answer (or the open question) as it was.
	// Optional cookies start off until you say otherwise.
	let draft = $state<Record<ConsentKeys, boolean>>({ hasAcceptedMarketing: false });
	$effect(() => {
		if (active) draft = { hasAcceptedMarketing: analyticsStore.hasAcceptedMarketing ?? false };
	});

	const save = () => {
		analyticsStore.setConsent('hasAcceptedMarketing', draft.hasAcceptedMarketing);
		analyticsStore.setHasAsked(true);
		active = false;
	};

	const acceptAll = () => {
		analyticsStore.acceptAll();
		analyticsStore.setHasAsked(true);
		active = false;
	};
</script>

<!-- Browser-only: this sits in the root layout, so it would otherwise be part of every
     server render, and on the server the modal's touch half (a vaul drawer) has no
     document to attach to. -->
{#if browser}
	<ResponsiveModal
		bind:open={active}
		title="Çerez tercihleri"
		description="Hangi çerezlere izin verdiğini buradan seçebilirsin. Tercihini istediğin zaman sayfanın altındaki “Çerez tercihleri” bağlantısından değiştirebilirsin."
	>
		<div class="bg-paper border-line divide-line flex flex-col divide-y rounded-md border">
			{#each COOKIE_TYPES as type (type.name)}
				{@const id = `cookie-${type.key ?? 'necessary'}`}
				<div class="flex min-h-14 items-center gap-4 px-4 py-3">
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span {id} class="text-ink text-sm font-semibold">{type.name}</span>
						<span id={`${id}-hint`} class="text-muted-foreground text-xs leading-snug">
							{type.description}
						</span>
					</div>
					{#if type.key}
						<Switch
							bind:checked={draft[type.key]}
							aria-labelledby={id}
							aria-describedby={`${id}-hint`}
						/>
					{:else}
						<span class="font-term text-muted-foreground shrink-0 text-base leading-none">
							her zaman açık
						</span>
					{/if}
				</div>
			{/each}
		</div>

		{#snippet footer()}
			<Button variant="outline" onclick={save}>Seçimi kaydet</Button>
			<Button variant="secondary" onclick={acceptAll}>Tümünü kabul et</Button>
		{/snippet}
	</ResponsiveModal>
{/if}
