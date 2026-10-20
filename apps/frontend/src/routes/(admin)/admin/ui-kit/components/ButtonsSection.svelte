<script lang="ts">
	import {
		ArrowRight,
		Bell,
		ChevronDown,
		Heart,
		MessageCircle,
		Plus,
		Share2,
		Trash2,
		X
	} from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import type { ButtonSize, ButtonVariant } from '#ui/primitives-new/button/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';

	const VARIANTS: ButtonVariant[] = [
		'default',
		'secondary',
		'outline',
		'ghost',
		'link',
		'destructive',
		'success'
	];
	const SIZES: ButtonSize[] = ['xs', 'sm', 'default', 'lg', 'xl'];
	const ICON_SIZES: ButtonSize[] = ['icon-xs', 'icon-sm', 'icon', 'icon-lg'];

	let loading = $state(false);
	const run = () => {
		loading = true;
		setTimeout(() => (loading = false), 1800);
	};
</script>

<KitSection
	id="buttons"
	title="Buttons"
	description="`default` is the acid stamp — one per view, for the action the page exists for. Everything else is a pill: `secondary` (ink) beside a primary, `outline` for the neutral alternative, `ghost` inside rows and toolbars. The shape lives on the variant, the height on the size.">
	<KitSpecimen label="Button · variants" note="#ui/wrapped/Button.svelte" wide>
		{#each VARIANTS as variant (variant)}
			<Button {variant}>{variant}</Button>
		{/each}
	</KitSpecimen>

	<KitSpecimen label="Button · sizes" note="xs 28 · sm 36 · default 40 · lg 44 · xl 48">
		{#each SIZES as size (size)}
			<Button {size}>{size}</Button>
		{/each}
		<div class="basis-full"></div>
		{#each SIZES as size (size)}
			<Button {size} variant="outline">{size}</Button>
		{/each}
	</KitSpecimen>

	<KitSpecimen label="Button · icons" note="`icon` leads, `suffixIcon` trails; both scale with the size">
		<Button icon={Plus}>İlan ver</Button>
		<Button variant="secondary" icon={MessageCircle}>Soru sor</Button>
		<Button variant="outline" suffixIcon={ArrowRight}>Devam et</Button>
		<Button variant="ghost" icon={Share2} size="sm">Paylaş</Button>
		<Button variant="outline" suffixIcon={ChevronDown} size="sm">Sırala</Button>
	</KitSpecimen>

	<KitSpecimen
		label="Button · loading and disabled"
		note="`loading` swaps the icon for a spinner and blocks the click; the label stays so the width doesn't jump">
		<Button {loading} onclick={run}>Teklifi gönder</Button>
		<Button variant="secondary" {loading} onclick={run} icon={MessageCircle}>Mesaj gönder</Button>
		<Button variant="outline" {loading} onclick={run}>Kaydet</Button>
		<Button size="icon" variant="outline" {loading} onclick={run} icon={Heart} aria-label="Favori" />
		<div class="basis-full"></div>
		{#each VARIANTS as variant (variant)}
			<Button {variant} disabled>{variant}</Button>
		{/each}
	</KitSpecimen>

	<KitSpecimen label="Button · as a link" note="`href` renders an <a>; `newTab` is web-only">
		<Button href="/admin/ui-kit#buttons">İç bağlantı</Button>
		<Button href="/admin/ui-kit#buttons" variant="outline" newTab suffixIcon={ArrowRight}>
			Yeni sekmede
		</Button>
		<Button href="/admin/ui-kit#buttons" variant="link">Tümünü gör</Button>
		<Button href="/admin/ui-kit#buttons" variant="outline" disabled>Kapalı bağlantı</Button>
	</KitSpecimen>

	<KitSpecimen
		label="Button · full width and long labels"
		note="Labels never wrap; a long one truncates inside the button instead of pushing the row wider"
		class="flex-col items-stretch">
		<Button class="w-full" size="lg">Satın al · ₺10.000</Button>
		<Button class="w-full" size="lg" variant="secondary">Teklif ver</Button>
		<div class="flex w-56 flex-col gap-2">
			<Button variant="outline">
				<span class="truncate">Kişisel verilerin korunması hakkında bilgilendirme</span>
			</Button>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Button · icon sizes"
		note="An icon-only `outline` is the round warm-white key (header, photo overlays)">
		{#each ICON_SIZES as size (size)}
			<Button {size} variant="outline" icon={Heart} aria-label="Favori" />
		{/each}
		<div class="basis-full"></div>
		{#each ICON_SIZES as size (size)}
			<Button {size} variant="ghost" icon={Bell} aria-label="Bildirimler" />
		{/each}
		<div class="basis-full"></div>
		{#each ICON_SIZES as size (size)}
			<Button {size} variant="secondary" icon={Plus} aria-label="Ekle" />
		{/each}
	</KitSpecimen>

	<KitSpecimen
		label="IconButton"
		note="#ui/wrapped/IconButton.svelte — a compact glyph key for rows and toolbars. Small on screen, 44px to the finger: the hit area extends past the visible box on touch. `label` names it (aria-label + hover title).">
		<IconButton icon={X} xs variant="ghost" label="Kapat" />
		<IconButton icon={X} sm variant="ghost" label="Kapat" />
		<IconButton icon={X} variant="ghost" label="Kapat" />
		<IconButton icon={X} lg variant="ghost" label="Kapat" />
		<div class="basis-full"></div>
		<IconButton icon={Trash2} sm variant="outline" label="Sil" />
		<IconButton icon={Trash2} variant="outline" label="Sil" />
		<IconButton icon={Trash2} variant="outline" circle label="Sil" />
		<IconButton icon={ArrowRight} label="Devam et" />
		<IconButton icon={Plus} variant="secondary" circle label="Ekle" />
		<IconButton icon={Heart} variant="outline" loading label="Favori" />
		<IconButton icon={Heart} variant="outline" disabled label="Favori" />
	</KitSpecimen>

	<KitSpecimen
		label="Buttonish"
		note="#ui/wrapped/Buttonish.svelte — the same face on a <div>, for the inside of a trigger (Popover.Trigger, DropdownMenu.Trigger, a ResponsivePopover `trigger` snippet), where a real <button> would nest in the trigger's own.">
		<Buttonish variant="outline" suffixIcon={ChevronDown}>Konum</Buttonish>
		<Buttonish variant="outline" size="sm" suffixIcon={ChevronDown}>Fiyat</Buttonish>
		<Buttonish variant="ghost" icon={Share2}>Paylaş</Buttonish>
		<Buttonish variant="outline" disabled suffixIcon={ChevronDown}>Kapalı</Buttonish>
		<Buttonish variant="outline" loading>Yükleniyor</Buttonish>
	</KitSpecimen>
</KitSection>
