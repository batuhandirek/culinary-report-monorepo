<script lang="ts">
	import { Camera, Gamepad2, Music, Package, Tag } from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import * as Tabs from '#ui/primitives-new/tabs/index.js';
	import * as UnderlineTabs from '#ui/primitives-new/underline-tabs/index.js';
	import Collapsible from '#ui/wrapped/Collapsible.svelte';
	import IconPaginator from '#ui/wrapped/IconPaginator.svelte';

	const STATES = [
		{ value: 'active', label: 'Satışta', count: 12 },
		{ value: 'offers', label: 'Teklif gelenler', count: 3 },
		{ value: 'expired', label: 'Süresi dolanlar', count: 0 },
		{ value: 'sold', label: 'Satılanlar', count: 48 },
		{ value: 'drafts', label: 'Taslaklar', count: 2 },
		{ value: 'rejected', label: 'Yayından kaldırılanlar', count: 1 }
	];

	let pill = $state('active');
	let segment = $state('camera');
	let page = $state('all');
	let side = $state('sell');
	let pageNo = $state(3);
	let open = $state(true);
</script>

<KitSection
	id="navigation"
	title="Tabs and disclosure"
	description="Two tab families and never a hand-rolled row of buttons: `UnderlineTabs` switches the page's own sections, `Tabs` (pills) filters or segments what is already on show. Both scroll sideways when they outgrow the viewport and fade at the edge that has more.">
	<KitSpecimen
		label="UnderlineTabs"
		note="#ui/primitives-new/underline-tabs — page-level tabs. Counts go in `eyebrow text-beet`."
		wide
		class="flex-col items-stretch">
		<UnderlineTabs.Root bind:value={page}>
			<UnderlineTabs.List>
				<UnderlineTabs.Trigger value="all">
					Tümü <span class="eyebrow text-beet">128</span>
				</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="favorites">Favorilerim</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="recent">Son baktıklarım</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="closed" disabled>Kapalı</UnderlineTabs.Trigger>
			</UnderlineTabs.List>
		</UnderlineTabs.Root>

		<UnderlineTabs.Root bind:value={side}>
			<UnderlineTabs.List>
				<UnderlineTabs.Trigger value="sell"><Tag /> Satış</UnderlineTabs.Trigger>
				<UnderlineTabs.Trigger value="buy"><Package /> Alış</UnderlineTabs.Trigger>
			</UnderlineTabs.List>
		</UnderlineTabs.Root>

		<div class="w-full max-w-[340px]">
			<span class="text-muted-foreground mb-1 block text-xs">340px wide — scrolls, fades at the open edge</span>
			<UnderlineTabs.Root bind:value={pill}>
				<UnderlineTabs.List>
					{#each STATES as s (s.value)}
						<UnderlineTabs.Trigger value={s.value}>
							{s.label}
							{#if s.count}<span class="eyebrow text-beet">{s.count}</span>{/if}
						</UnderlineTabs.Trigger>
					{/each}
				</UnderlineTabs.List>
			</UnderlineTabs.Root>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Tabs · pills"
		note="#ui/primitives-new/tabs — a filter or a segment. Active is the ink chip."
		wide
		class="flex-col items-stretch">
		<Tabs.Root bind:value={pill}>
			<Tabs.List>
				{#each STATES as s (s.value)}
					<Tabs.Trigger value={s.value}>
						{s.label}
						{#if s.count}<span class="font-term text-base leading-none opacity-70">{s.count}</span>{/if}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>

		<Tabs.Root bind:value={segment}>
			<Tabs.List>
				<Tabs.Trigger value="camera"><Camera /> Fotoğraf &amp; Kamera</Tabs.Trigger>
				<Tabs.Trigger value="games"><Gamepad2 /> Retro Oyun &amp; Konsol</Tabs.Trigger>
				<Tabs.Trigger value="music"><Music /> Müzik</Tabs.Trigger>
				<Tabs.Trigger value="closed" disabled>Kapalı</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>

		<div class="w-full max-w-[340px]">
			<span class="text-muted-foreground mb-1 block text-xs">340px wide</span>
			<Tabs.Root bind:value={pill}>
				<Tabs.List>
					{#each STATES as s (s.value)}
						<Tabs.Trigger value={s.value}>{s.label}</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</Tabs.Root>
		</div>
	</KitSpecimen>

	<KitSpecimen label="Collapsible" note="#ui/wrapped/Collapsible.svelte" ground="paper" stack>
		<Collapsible bind:open withSuffixIcon triggerClass="min-h-11 justify-between font-semibold">
			{#snippet trigger()}
				Kargo ve teslimat
			{/snippet}
			{#snippet children()}
				<p class="text-muted-foreground pb-3 text-sm">
					Satıcı ürünü 3 iş günü içinde kargoya verir. Ürün eline ulaşana kadar ödemen
					güvende kalır.
				</p>
			{/snippet}
		</Collapsible>
		<Collapsible withPrefixIcon triggerClass="min-h-11 font-semibold">
			{#snippet trigger()}
				Önde ok ile
			{/snippet}
			{#snippet children()}
				<p class="text-muted-foreground pb-3 text-sm">İçerik.</p>
			{/snippet}
		</Collapsible>
	</KitSpecimen>

	<KitSpecimen label="IconPaginator" note="#ui/wrapped/IconPaginator.svelte — numbered pages for a finite list">
		<IconPaginator bind:page={pageNo} perPage={10} count={124} />
	</KitSpecimen>
</KitSection>
