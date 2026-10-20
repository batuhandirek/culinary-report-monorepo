<script lang="ts">
	import { ArrowUpDown, Mail, MapPin, Search } from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import { Label } from '#ui/primitives-new/label/index.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import CurrencyInput from '#ui/wrapped/formatted-input/currency-input.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import PasswordInput from '#ui/wrapped/PasswordInput.svelte';
	import PinInput from '#ui/wrapped/PinInput.svelte';
	import ResponsiveCombobox from '#ui/wrapped/ResponsiveCombobox.svelte';
	import ResponsiveMultiCombobox from '#ui/wrapped/ResponsiveMultiCombobox.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	const CITIES = [
		'Adana',
		'Afyonkarahisar',
		'Ankara',
		'Antalya',
		'Bursa',
		'Çanakkale',
		'Diyarbakır',
		'Eskişehir',
		'Gaziantep',
		'İstanbul',
		'İzmir',
		'Kahramanmaraş',
		'Şanlıurfa',
		'Trabzon'
	].map((label) => ({ label, value: label }));

	const SORTS = [
		{ label: 'En yeni', value: 'newest' },
		{ label: 'Fiyat: düşükten yükseğe', value: 'price-asc' },
		{ label: 'Fiyat: yüksekten düşüğe', value: 'price-desc' }
	];

	let text = $state('');
	let email = $state('kullanici@');
	let search = $state('');
	let searching = $state(false);
	let password = $state<string | undefined>('gizli-sifre');
	let pin = $state('');
	let price = $state<number | undefined>(12500);
	let note = $state('');
	let sort = $state('newest');
	let city = $state<string | number | null>(null);
	let cityOpen = $state(false);
	let cities = $state<(string | number | null)[] | null>(['İstanbul', 'İzmir']);

	const onSearch = () => {
		searching = true;
		setTimeout(() => (searching = false), 900);
	};
</script>

<KitSection
	id="fields"
	title="Fields"
	description="One box for every text control: 44px tall on touch and 40px on desktop, a 10px radius, a warm hairline that turns ink on focus with a green ring, and a red hairline when `aria-invalid`. Labels, hints and error lines come from the form system (`#ui/components/form`), shown under Blocks.">
	<KitSpecimen label="Input" note="#ui/wrapped/Input.svelte — `icon` leads, `loading` trails" stack>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-text">Ad soyad</Label>
			<Input id="kit-text" bind:value={text} placeholder="Adın ve soyadın" autocomplete="name" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-search">Arama</Label>
			<Input
				id="kit-search"
				type="search"
				icon={Search}
				bind:value={search}
				loading={searching}
				oninput={onSearch}
				placeholder="Ürün, marka veya kategori ara" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-email">E-posta (geçersiz)</Label>
			<Input
				id="kit-email"
				type="email"
				icon={Mail}
				bind:value={email}
				aria-invalid="true"
				inputmode="email"
				autocomplete="email" />
			<span class="text-destructive text-xs font-medium">Geçerli bir e-posta adresi gir.</span>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-disabled">Kapalı</Label>
			<Input id="kit-disabled" value="Değiştirilemez" disabled />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-readonly">Salt okunur</Label>
			<Input id="kit-readonly" value="TR12 0006 4000 0011 2345 6789 01" readonly />
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Password · PIN · currency"
		note="PasswordInput, PinInput, formatted-input/currency-input"
		class="flex-col items-stretch">
		<div class="flex flex-col gap-1.5">
			<Label for="kit-password">Şifre</Label>
			<PasswordInput id="kit-password" bind:value={password} autocomplete="current-password" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label>Doğrulama kodu</Label>
			<PinInput bind:value={pin} />
			<span class="text-muted-foreground text-xs">Girilen: {pin || '—'}</span>
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="kit-price">Fiyat</Label>
			<CurrencyInput
				id="kit-price"
				bind:value={price}
				placeholder="₺0"
				inputmode="numeric"
				class="text-lg font-semibold md:text-lg" />
			<span class="text-muted-foreground text-xs">Değer: {price ?? '—'}</span>
		</div>
	</KitSpecimen>

	<KitSpecimen label="Textarea" note="#ui/primitives-new/textarea — grows with its content" stack>
		<Textarea bind:value={note} placeholder="Ürünü birkaç cümleyle anlat" rows={3} />
		<Textarea value="Kutusu ve faturası duruyor." aria-invalid="true" rows={2} />
		<Textarea value="Kapalı alan" disabled rows={2} />
	</KitSpecimen>

	<KitSpecimen
		label="Select and comboboxes"
		note="`Select`: a short fixed list (sort orders). `ResponsiveCombobox` / `ResponsiveMultiCombobox`: a long list with search — a popover on desktop, a sheet on touch. Their box is `FieldTrigger`: a field's face for the inside of any trigger."
		class="flex-col items-stretch">
		<div class="flex flex-col gap-1.5">
			<Label>Sıralama</Label>
			<Select items={SORTS} bind:value={sort} icon={ArrowUpDown} width={240} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label>Şehir</Label>
			<ResponsiveCombobox
				items={CITIES}
				bind:selected={city}
				bind:open={cityOpen}
				onSelect={() => (cityOpen = false)}
				placeholder="Şehir seç" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label>Şehirler</Label>
			<ResponsiveMultiCombobox items={CITIES} bind:selected={cities} placeholder="Şehir seç" />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label>Kapalı</Label>
			<ResponsiveCombobox items={CITIES} selected={null} placeholder="Önce şehir seç" disabled />
		</div>
	</KitSpecimen>

	<KitSpecimen label="Fields on paper" note="The same controls inside a card or a dialog" ground="paper" stack>
		<Input placeholder="Adres başlığı" icon={MapPin} />
		<Textarea placeholder="Açık adres" rows={2} />
	</KitSpecimen>
</KitSection>
