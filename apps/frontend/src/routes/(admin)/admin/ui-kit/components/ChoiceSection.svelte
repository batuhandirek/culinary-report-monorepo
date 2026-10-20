<script lang="ts">
	import { Package } from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import { Label } from '#ui/primitives-new/label/index.js';
	import * as RadioGroup from '#ui/primitives-new/radio-group/index.js';
	import { Switch } from '#ui/primitives-new/switch/index.js';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import Radio from '#ui/wrapped/Radio.svelte';
	import RadioRows from '#ui/wrapped/RadioRows.svelte';
	import StarRating from '#ui/wrapped/StarRating.svelte';

	const PARCELS = [
		{
			value: 'S',
			label: 'Küçük',
			hint: 'Ayakkabı kutusu kadar, 2 kg’a kadar',
			icon: Package,
			iconSize: 16
		},
		{
			value: 'M',
			label: 'Orta',
			hint: 'Sırt çantası kadar, 5 kg’a kadar',
			icon: Package,
			iconSize: 23
		},
		{
			value: 'L',
			label: 'Büyük',
			hint: 'Bavul kadar, 15 kg’a kadar — kargo şubesine kendin götürmen gerekebilir',
			icon: Package,
			iconSize: 30
		}
	];
	const PAYERS = [
		{ value: 'buyer', label: 'Alıcı öder' },
		{ value: 'seller', label: 'Ben öderim' }
	];

	let accepted = $state(false);
	let newsletter = $state(true);
	let partial = $state(true);
	let pushOn = $state(true);
	let emailOn = $state(false);
	let reason = $state('sold');
	let parcel = $state<string | null>('M');
	let payer = $state<string | null>('buyer');
	let rating = $state(4);
</script>

<KitSection
	id="choice"
	title="Choice"
	description="Selected is ink, never acid: a checked box, a picked radio and an active chip all read as the same decision. Every control toggles from its whole row, so the tap target is the label, not the 20px glyph.">
	<KitSpecimen
		label="Checkbox"
		note="#ui/wrapped/Checkbox.svelte — the label is part of the control"
		stack>
		<Checkbox bind:checked={accepted}>Hesap sözleşmesini okudum, kabul ediyorum</Checkbox>
		<Checkbox bind:checked={newsletter}>Yeni ilanlardan haberdar et</Checkbox>
		<Checkbox checked={false} bind:indeterminate={partial}
			>Tümünü seç (bazıları seçili)</Checkbox>
		<Checkbox checked disabled>Kapalı, seçili</Checkbox>
		<Checkbox checked={false} disabled>Kapalı</Checkbox>
		<Checkbox checked={false} aria-invalid="true">Onay gerekli (geçersiz)</Checkbox>
		<Checkbox bind:checked={accepted} class="min-h-11">
			Uzun etiket: kişisel verilerimin işlenmesine ilişkin aydınlatma metnini okudum ve ticari
			elektronik ileti gönderilmesine izin veriyorum
		</Checkbox>
	</KitSpecimen>

	<KitSpecimen
		label="Switch"
		note="#ui/primitives-new/switch — for a setting that applies at once"
		stack>
		<div class="flex min-h-11 items-center justify-between gap-4">
			<Label for="kit-sw-push" class="font-medium">Anlık bildirimler</Label>
			<Switch id="kit-sw-push" bind:checked={pushOn} />
		</div>
		<div class="flex min-h-11 items-center justify-between gap-4">
			<Label for="kit-sw-mail" class="font-medium">E-posta bildirimleri</Label>
			<Switch id="kit-sw-mail" bind:checked={emailOn} />
		</div>
		<div class="flex min-h-11 items-center justify-between gap-4">
			<Label for="kit-sw-off" class="font-medium">Kapalı</Label>
			<Switch id="kit-sw-off" checked disabled />
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="RadioRows"
		note="#ui/wrapped/RadioRows.svelte — a few options that each deserve a sentence. `joined` for single-line rows; an option's `icon` + `iconSize` show relative size (parcel boxes)."
		class="flex-col items-stretch">
		<RadioRows
			label="Paket boyutu"
			options={PARCELS}
			value={parcel}
			onChange={(v) => (parcel = v)} />
		<RadioRows
			joined
			label="Kargo ücretini kim öder"
			options={PAYERS}
			value={payer}
			onChange={(v) => (payer = v)} />
		<RadioRows label="Kapalı" options={PAYERS} value="buyer" onChange={() => {}} disabled />
	</KitSpecimen>

	<KitSpecimen
		label="Radio"
		note="#ui/wrapped/Radio.svelte — one compact line inside a RadioGroup.Root, for a short self-explanatory set"
		class="flex-col items-stretch">
		<RadioGroup.Root bind:value={reason} class="gap-0">
			<Radio value="sold">Culinary Report'ta sattım</Radio>
			<Radio value="elsewhere">Başka bir yerde sattım</Radio>
			<Radio value="changed-mind">Satmaktan vazgeçtim</Radio>
		</RadioGroup.Root>
		<RadioGroup.Root value="a" disabled class="gap-0">
			<Radio value="a">Kapalı, seçili</Radio>
			<Radio value="b">Kapalı</Radio>
		</RadioGroup.Root>
	</KitSpecimen>

	<KitSpecimen
		label="StarRating"
		note="#ui/wrapped/StarRating.svelte — a control when editable, a display when `readonly`">
		<div class="flex flex-col gap-3">
			<StarRating bind:value={rating} size="lg" />
			<span class="text-muted-foreground text-xs">Puan: {rating}</span>
			<StarRating value={4.5} readonly size="md" allowHalf />
			<StarRating value={3} readonly size="sm" />
			<StarRating value={0} readonly size="sm" />
		</div>
	</KitSpecimen>
</KitSection>
