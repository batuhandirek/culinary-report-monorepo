<script lang="ts">
	import {
		ChevronDown,
		Ellipsis,
		Flag,
		Pencil,
		Share2,
		SlidersHorizontal,
		Trash2
	} from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import { Label } from '#ui/primitives-new/label/index.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import CurrencyInput from '#ui/wrapped/formatted-input/currency-input.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import ResponsiveModal from '#ui/wrapped/ResponsiveModal.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';

	let plainOpen = $state(false);
	let footerOpen = $state(false);
	let longOpen = $state(false);
	let formOpen = $state(false);
	let wideOpen = $state(false);
	let confirmOpen = $state(false);
	let popoverOpen = $state(false);
	let offer = $state<number | undefined>(undefined);
	let message = $state('');
	let menuChecked = $state(true);
	let lastAction = $state('—');

	const PARAGRAPHS = Array.from({ length: 14 }, (_, i) => i + 1);
</script>

<KitSection
	id="overlays"
	title="Overlays"
	description="User-facing dialogs are `ResponsiveModal`: a centred dialog from `lg` up, a bottom sheet with a grabber below it. The body is the only part that scrolls, and it shades the edge that has more. A popover follows the same split through `ResponsivePopover`.">
	<KitSpecimen label="ResponsiveModal" note="#ui/wrapped/ResponsiveModal.svelte" wide>
		<Button variant="outline" onclick={() => (plainOpen = true)}>Title and body</Button>
		<Button variant="outline" onclick={() => (footerOpen = true)}>With footer</Button>
		<Button variant="outline" onclick={() => (longOpen = true)}>Long body</Button>
		<Button variant="outline" onclick={() => (formOpen = true)}>With a form</Button>
		<Button variant="outline" onclick={() => (wideOpen = true)}>size="lg"</Button>

		<ResponsiveModal
			bind:open={plainOpen}
			title="Alıcı koruması nasıl çalışır?"
			description="Ödemen, ürün eline ulaşıp onay verene kadar bizde kalır.">
			<p>
				Ürün ilandaki gibi değilse teslimden sonraki 2 gün içinde sorun bildirebilirsin; iade
				kargosu bizden.
			</p>
		</ResponsiveModal>

		<ResponsiveModal
			bind:open={footerOpen}
			title="İlanı yayından kaldır"
			description="İlan aramalarda görünmez olur. İstediğin zaman yeniden yayınlayabilirsin.">
			<p class="text-muted-foreground">Bekleyen 2 teklif otomatik olarak reddedilir.</p>
			{#snippet footer()}
				<Button variant="outline" onclick={() => (footerOpen = false)}>Vazgeç</Button>
				<Button onclick={() => (footerOpen = false)}>Yayından kaldır</Button>
			{/snippet}
		</ResponsiveModal>

		<ResponsiveModal
			bind:open={longOpen}
			title="Ön bilgilendirme formu"
			description="Uzun içerik: yalnızca gövde kayar, başlık ve alt bar yerinde kalır.">
			{#each PARAGRAPHS as n (n)}
				<p>
					{n}. Satıcı, sözleşme konusu ürünü eksiksiz, siparişte belirtilen niteliklere uygun
					ve varsa garanti belgeleri ile teslim etmeyi kabul eder.
				</p>
			{/each}
			{#snippet footer()}
				<Button onclick={() => (longOpen = false)}>Okudum, anladım</Button>
			{/snippet}
		</ResponsiveModal>

		<ResponsiveModal
			bind:open={formOpen}
			title="Teklif ver"
			description="Satıcı 24 saat içinde yanıtlamazsa teklifin kendiliğinden düşer.">
			<div class="flex flex-col gap-1.5">
				<Label for="kit-offer">Teklifin</Label>
				<CurrencyInput id="kit-offer" bind:value={offer} placeholder="₺0" inputmode="numeric" />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="kit-offer-note">Not (isteğe bağlı)</Label>
				<Textarea id="kit-offer-note" bind:value={message} rows={3} placeholder="Satıcıya kısa bir not" />
			</div>
			<!-- A dialog with inputs keeps its actions in the scrolling body: a pinned footer and
			     the keyboard leave nothing for the field. -->
			<Button class="w-full" size="lg" onclick={() => (formOpen = false)}>Teklifi gönder</Button>
		</ResponsiveModal>

		<ResponsiveModal bind:open={wideOpen} size="lg" title="Geniş pencere" description="`size` sets the desktop width: sm 400 · md 512 (default) · lg 672 · xl 896.">
			<div class="bg-wash h-40 rounded-md"></div>
		</ResponsiveModal>
	</KitSpecimen>

	<KitSpecimen
		label="ResponsivePopover"
		note="#ui/wrapped/ResponsivePopover.svelte — an anchored card on desktop, a sheet on touch">
		<ResponsivePopover bind:open={popoverOpen} title="Fiyat aralığı" hideHeader="popover" align="start">
			{#snippet trigger()}
				<Buttonish variant="outline" icon={SlidersHorizontal} suffixIcon={ChevronDown}>Fiyat</Buttonish>
			{/snippet}
			<div class="flex flex-col gap-3">
				<Checkbox checked>Yalnızca ücretsiz kargo</Checkbox>
				<Checkbox checked={false}>Kargo bedava</Checkbox>
			</div>
			{#snippet footer()}
				<Button variant="ghost" size="sm" onclick={() => (popoverOpen = false)}>Temizle</Button>
				<Button variant="secondary" size="sm" onclick={() => (popoverOpen = false)}>Uygula</Button>
			{/snippet}
		</ResponsivePopover>

		<ResponsivePopover title="Kapalı" disabled>
			{#snippet trigger()}
				<Buttonish variant="outline" disabled suffixIcon={ChevronDown}>Kapalı</Buttonish>
			{/snippet}
			<p>Açılmaz.</p>
		</ResponsivePopover>
	</KitSpecimen>

	<KitSpecimen
		label="PopConfirm"
		note="#ui/wrapped/PopConfirm.svelte — asks before something that cannot be undone; the system dialog on native. `destructive` paints the confirm red.">
		<PopConfirm
			title="İlanı sil"
			description="İlan ve ona gelen teklifler kalıcı olarak silinir. Bu işlem geri alınamaz."
			confirmText="Sil"
			cancelText="Vazgeç"
			destructive
			onConfirm={() => (lastAction = 'silindi')}
			onCancel={() => (lastAction = 'vazgeçildi')}>
			<Buttonish variant="outline" icon={Trash2}>Sil…</Buttonish>
		</PopConfirm>
		<Button variant="outline" onclick={() => (confirmOpen = true)}>Opened from state</Button>
		<PopConfirm
			bind:open={confirmOpen}
			title="Teklifi kabul et"
			description="₺9.500 teklifini kabul edince alıcının ödeme yapması için 24 saati olur."
			confirmText="Kabul et"
			cancelText="Vazgeç"
			onConfirm={() => (lastAction = 'kabul edildi')} />
		<span class="text-muted-foreground text-xs">Son: {lastAction}</span>
	</KitSpecimen>

	<KitSpecimen label="DropdownMenu" note="#ui/primitives-new/dropdown-menu — row actions. Open a dialog from an item by rendering it outside the menu.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Buttonish variant="outline" size="icon" icon={Ellipsis} aria-label="İlan işlemleri" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="w-56">
				<DropdownMenu.Label>İlan işlemleri</DropdownMenu.Label>
				<DropdownMenu.Item onSelect={() => (lastAction = 'düzenle')}><Pencil /> Düzenle</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => (lastAction = 'paylaş')}><Share2 /> Paylaş</DropdownMenu.Item>
				<DropdownMenu.CheckboxItem bind:checked={menuChecked}>Ücretsiz kargo</DropdownMenu.CheckboxItem>
				<DropdownMenu.Item disabled><Flag /> Şikayet et</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onSelect={() => (lastAction = 'sil')}>
					<Trash2 /> Sil
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</KitSpecimen>
</KitSection>
