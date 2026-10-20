<script lang="ts">
	import {
		Bell,
		Bookmark,
		Camera,
		CircleHelp,
		MapPin,
		Package,
		Plus,
		ShieldCheck,
		Truck,
		UserRound
	} from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';
	import MoreBlocksSpecimens from './MoreBlocksSpecimens.svelte';

	import { ensureExists, isEmail, minLength } from '#lib/validation.js';
	import { createForm, Form } from '#ui/components/form/index.js';
	import Image from '#ui/components/Image.svelte';
	import NoResult from '#ui/components/NoResult.svelte';
	import SlideFetcher from '#ui/components/SlideFetcher.svelte';
	import SomethingWentWrong from '#ui/components/SomethingWentWrong.svelte';
	import Spinner from '#ui/components/Spinner.svelte';
	import Stat from '#ui/components/Stat.svelte';
	import { DATE_FORMATS, type DateFormat, formatDate, formatRelativeDate } from '#ui/lib/date.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import KeyValueList from '#ui/wrapped/KeyValueList.svelte';
	import KeyValueRow from '#ui/wrapped/KeyValueRow.svelte';
	import ListRow from '#ui/wrapped/ListRow.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import PageHeader from '#ui/wrapped/PageHeader.svelte';
	import Panel from '#ui/wrapped/Panel.svelte';
	import SkeletonCard from '#ui/wrapped/SkeletonCard.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';
	import StickyActionBar from '#ui/wrapped/StickyActionBar.svelte';

	// ── Stand-in APIs for the fetcher states ─────────────────────────────────────────────
	type Row = { id: number; title: string };
	type Page = { items: Row[]; page: number; pageSize: number; totalItems: number };
	type Query = { page: number; size: number };

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
	const TOTAL = 14;

	const paged = async (query: Query): Promise<Page> => {
		await wait(700);
		const start = (query.page - 1) * query.size;
		return {
			items: Array.from(
				{ length: Math.max(Math.min(query.size, TOTAL - start), 0) },
				(_, i) => ({
					id: start + i + 1,
					title: `Nintendo Game Boy klasik gri · ${start + i + 1}`
				})
			),
			page: query.page,
			pageSize: query.size,
			totalItems: TOTAL
		};
	};
	const never = () => new Promise<Page>(() => {});
	const nothing = async (query: Query): Promise<Page> => {
		await wait(400);
		return { items: [], page: 1, pageSize: query.size, totalItems: 0 };
	};
	// Fails once, then answers: what the retry button is for.
	let flakyCalls = 0;
	const flaky = async (query: Query): Promise<Page> => {
		await wait(500);
		if (flakyCalls++ === 0) throw new Error('demo');
		return paged(query);
	};

	let pagedFetcher = $state<{ reload: () => Promise<void> }>();

	// ── Form ─────────────────────────────────────────────────────────────────────────────
	const form = createForm({
		fields: {
			title: {
				type: 'text' as const,
				label: 'Adres adı',
				placeholder: 'Ev, İş…',
				optional: true,
				hint: 'Sadece sen görürsün.',
				col: 6
			},
			email: {
				type: 'email' as const,
				label: 'E-posta',
				placeholder: 'ornek@eposta.com',
				required: true,
				validation: [ensureExists, isEmail],
				col: 6
			},
			note: {
				type: 'textarea' as const,
				label: 'Satıcıya not',
				placeholder: 'Zil çalışmıyor, kapıyı çal.',
				maxlength: 120,
				counter: true,
				required: true,
				validation: [ensureExists, minLength(10)]
			},
			size: {
				type: 'select' as const,
				label: 'Paket boyutu',
				hint: 'Emin değilsen bir büyüğünü seç.',
				items: [
					{ value: 'S', label: 'Küçük' },
					{ value: 'M', label: 'Orta' }
				]
			}
		},
		onSubmit: async () => {
			await wait(900);
		}
	});

	const now = new Date();
	const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
	const RELATIVE = [0.2, 12, 185, 60 * 26, 60 * 24 * 4, 60 * 24 * 40, 60 * 24 * 500];

	let noticeOpen = $state(true);
</script>

<KitSection
	id="blocks"
	title="Blocks"
	description="What pages are assembled from: the head of a page, the surfaces its sections sit on, rows, label–value lists, callouts, and every data state — loading, empty, failed. A page that hand-rolls one of these should be using the block instead."
>
	<KitSpecimen
		label="PageHeader"
		note="#ui/wrapped/PageHeader.svelte — pair with MobileMenu and `desktopOnly` on pages the app bar already titles"
		wide
		class="!flex-col !flex-nowrap !items-stretch !gap-8"
	>
		<PageHeader
			title="Siparişler"
			description="Aldığın ve sattığın ürünlerin kargo durumu, ödemesi ve değerlendirmesi burada."
		>
			{#snippet actions()}
				<Button variant="outline">İlanlara göz at</Button>
				<Button icon={Plus}>İlan ver</Button>
			{/snippet}
		</PageHeader>
		<PageHeader
			eyebrow="Hesabım"
			title="Kenwood KA-3500 entegre amfi, 1978 model, kutusu ve faturasıyla"
			backHref="#blocks"
			backLabel="Siparişler"
		>
			{#snippet badge()}
				<Badge pill variant="warning">Kargo bekleniyor</Badge>
			{/snippet}
		</PageHeader>
	</KitSpecimen>

	<KitSpecimen
		label="Panel · title, actions"
		note="#ui/wrapped/Panel.svelte — the paper card every section sat on by hand"
	>
		<Panel title="Sipariş özeti" description="Tutarlar ödeme anında sabitlenir." class="w-full">
			{#snippet actions()}
				<Button variant="link" size="sm">Düzenle</Button>
			{/snippet}
			<KeyValueList
				items={[
					{ label: 'Ürün', value: '₺10.000' },
					{ label: 'Alıcı koruma bedeli', value: '₺1.000' },
					{ label: 'Kargo', value: '₺89,90', hint: 'tahmini' },
					{ label: 'İndirim', value: undefined },
					{ label: 'Toplam', value: '₺11.089,90', strong: true }
				]}
			/>
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="Panel · rows + ListRow"
		note="`<Panel rows caption>` + #ui/wrapped/ListRow.svelte"
	>
		<Panel rows caption="Hesap" class="w-full">
			<ListRow href="#blocks" icon={UserRound} title="Profil bilgilerim" />
			<ListRow href="#blocks" icon={MapPin} title="Adreslerim" value="2" />
			<ListRow
				href="#blocks"
				icon={Bell}
				title="Bildirim izinleri"
				hint="Teklif, mesaj ve kargo bildirimleri"
			/>
			<ListRow icon={ShieldCheck} title="Kimlik doğrulama">
				{#snippet trailing()}
					<Badge pill variant="success">Doğrulandı</Badge>
				{/snippet}
			</ListRow>
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="ListRow · icon well, strong, active, long text"
		note="A link with `href`, a button with `onclick`, plain otherwise. 48px at least."
	>
		<Panel rows class="w-full">
			<ListRow href="#blocks" title="Tüm ilanlar" strong />
			<ListRow href="#blocks" icon={Camera} iconWell title="Fotoğraf & Kamera" value={128} />
			<ListRow href="#blocks" icon={Bookmark} iconWell title="Koleksiyon" value={64} active />
			<ListRow
				onclick={() => {}}
				icon={Package}
				iconWell
				title="Elektronik müzik aletleri, synthesizer ve davul makineleri"
				hint="Uzun bir başlık satıra sığmadığında kırılır, taşmaz"
			/>
			<ListRow icon={CircleHelp} title="Devre dışı bir satır" href="#blocks" disabled />
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="Panel · tones and heads"
		note="`tone` · `heading=&quot;eyebrow&quot;` · `bar` · `sticker`"
		class="!flex-col !flex-nowrap !items-stretch"
	>
		<Panel tone="tint" heading="eyebrow" title="Satıcının notları" padding="sm">
			<p class="text-reading-ink m-0 text-sm leading-relaxed">
				Kutusu ve kulaklığı yok. Pil kapağı orijinal, ekranında çizik bulunmuyor.
			</p>
		</Panel>
		<Panel bar sticker title="Kategoriler" padding="sm">
			<p class="text-muted-foreground m-0 text-sm">
				A sidebar card: the title in its own bar.
			</p>
		</Panel>
		<Panel tone="danger" title="Sorun bildirildi" padding="sm">
			<p class="text-reading-ink m-0 text-sm">Alıcı ürünün çalışmadığını bildirdi.</p>
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="KeyValueList"
		note="#ui/wrapped/KeyValueList.svelte (+ KeyValueRow) — a real <dl>. `between` for amounts, `columns` for facts."
		class="!flex-col !flex-nowrap !items-stretch !gap-6"
	>
		<Panel padding="sm">
			<KeyValueList>
				<KeyValueRow label="Satış fiyatı" value="₺10.000" />
				<KeyValueRow label="Hizmet bedeli (%5)" value="−₺500" />
				<KeyValueRow label="Kargo">
					<span class="text-faint mr-1 line-through">₺89,90</span>
					<span class="text-success font-semibold">Ücretsiz</span>
				</KeyValueRow>
				<KeyValueRow label="Sana geçecek" value="₺9.500" strong />
			</KeyValueList>
		</Panel>
		<Panel padding="sm">
			<KeyValueList
				layout="columns"
				items={[
					{ label: 'Kargo firması', value: 'PTT Kargo' },
					{ label: 'Takip numarası', value: 'KP0123456789TR' },
					{ label: 'Durum', value: 'Dağıtıma çıktı', tone: 'success' },
					{ label: 'Teslim alan', value: null }
				]}
			/>
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="Notice"
		note="#ui/wrapped/Notice.svelte — a callout with a title, a sentence and an action. One-liners stay `ink-strip`."
		wide
		class="!flex-col !flex-nowrap !items-stretch"
	>
		<Notice
			title="Kargoya vermek için 2 günün var"
			text="Süre dolarsa sipariş iptal edilir ve alıcıya ödemesi iade edilir."
		>
			{#snippet actions()}
				<Button size="sm" variant="secondary">Kargola</Button>
			{/snippet}
		</Notice>
		<Notice
			tone="info"
			text="Kimlik bilgilerin e-Devlet üzerinden doğrulanır; biz saklamayız."
		/>
		<Notice
			tone="success"
			title="Ödemen alındı"
			text="Satıcı ürünü kargoya verdiğinde haber vereceğiz."
		/>
		<Notice tone="warning" size="sm" text="İlanının süresi yarın doluyor." />
		{#if noticeOpen}
			<Notice
				tone="danger"
				title="Ödeme tamamlanamadı"
				text="Kartından tutar çekilmedi. Bilgilerini kontrol edip yeniden dene."
				onDismiss={() => (noticeOpen = false)}
			/>
		{:else}
			<Button
				variant="outline"
				size="sm"
				class="self-start"
				onclick={() => (noticeOpen = true)}
			>
				Show the dismissible notice again
			</Button>
		{/if}
	</KitSpecimen>

	<KitSpecimen
		label="EmptyState"
		note="#ui/wrapped/EmptyState.svelte — icon, one title, one hint, one action. `NoResult` is its search preset."
		class="!flex-col !flex-nowrap !items-stretch"
	>
		<EmptyState
			icon={Package}
			title="Henüz siparişin yok"
			hint="Satın aldığın ürünlerin kargo durumu burada görünür."
		>
			<Button variant="outline">İlanlara göz at</Button>
		</EmptyState>
		<EmptyState ground="paper" size="sm" icon={Bell} title="Henüz bildirimin yok" />
		<NoResult sm />
	</KitSpecimen>

	<KitSpecimen
		label="EmptyState · ground none, ErrorState"
		note="`ground=&quot;none&quot;` inside a card that is already the surface · #ui/wrapped/ErrorState.svelte"
		ground="paper"
		class="!flex-col !flex-nowrap !items-stretch"
	>
		<EmptyState
			ground="none"
			size="sm"
			icon={Truck}
			title="Kargo bilgisi bekleniyor"
			hint="Satıcı kargoya verdiğinde takip numarası burada görünür."
		/>
		<ErrorState onRetry={() => wait(900)} />
		<SomethingWentWrong sm description="Mesajlar yüklenemedi" />
	</KitSpecimen>

	<KitSpecimen
		label="Skeleton presets"
		note="SkeletonRows · SkeletonCard · SkeletonText (#ui/wrapped) — the loading twin of the content, never a lone spinner"
		wide
		class="!flex-col !flex-nowrap !items-stretch !gap-5"
	>
		<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
			<SkeletonRows leading="thumb" lines={3} />
			<SkeletonRows leading="avatar" trailing count={4} />
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
			<SkeletonCard count={6} />
		</div>
		<Panel padding="sm">
			<SkeletonText lines={4} />
		</Panel>
	</KitSpecimen>

	<KitSpecimen
		label="SlideFetcher · first load"
		note="`showLoader` + `skeleton=&quot;rows | cards | spinner&quot;`, or your own `loadingSnippet`"
		class="!flex-col !flex-nowrap !items-stretch !gap-5"
	>
		<SlideFetcher api={never} showLoader size={3}>
			{#snippet children()}{/snippet}
		</SlideFetcher>
		<SlideFetcher api={never} showLoader skeleton="cards" size={4}>
			{#snippet children()}{/snippet}
		</SlideFetcher>
	</KitSpecimen>

	<KitSpecimen
		label="SlideFetcher · empty, failed"
		note="The default empty state, and an error that can be retried (fails once, then loads)"
		class="!flex-col !flex-nowrap !items-stretch !gap-5"
	>
		<SlideFetcher api={nothing} showLoader size={5}>
			{#snippet children()}{/snippet}
		</SlideFetcher>
		<SlideFetcher api={flaky} showLoader size={5}>
			{#snippet children({ results })}
				<Panel rows class="w-full">
					{#each results as row (row.id)}
						<ListRow title={row.title} />
					{/each}
				</Panel>
			{/snippet}
		</SlideFetcher>
	</KitSpecimen>

	<KitSpecimen
		label="SlideFetcher · pages, reload, end"
		note="Scroll for the next page. `reload()` keeps the list up, dimmed, instead of blanking it. `endText` closes a list of more than one page."
		wide
		class="!flex-col !flex-nowrap !items-stretch"
	>
		<Button
			variant="outline"
			size="sm"
			class="self-start"
			onclick={() => pagedFetcher?.reload()}
		>
			reload()
		</Button>
		<div class="border-line bg-paper max-h-72 overflow-y-auto rounded-md border">
			<SlideFetcher
				bind:this={pagedFetcher}
				api={paged}
				showLoader
				size={6}
				endText="Hepsi bu kadar"
			>
				{#snippet loadingSnippet()}
					<SkeletonRows boxed={false} count={5} lines={1} class="px-4" />
				{/snippet}
				{#snippet children({ results })}
					<div class="divide-line flex flex-col divide-y">
						{#each results as row (row.id)}
							<ListRow title={row.title} value={`#${row.id}`} />
						{/each}
					</div>
				{/snippet}
			</SlideFetcher>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Form"
		note="#ui/components/form — `required`, `optional`, `hint`, `counter`. Submit it empty: the error is read out and the first bad field takes focus."
		ground="paper"
		class="!items-stretch"
	>
		<Form {form} submitText="Kaydet" class="w-full" />
	</KitSpecimen>

	<KitSpecimen
		label="Stat · Spinner · Image"
		note="#ui/components — Spinner takes the text colour around it; Image holds its box and survives a dead URL"
		class="!flex-col !flex-nowrap !items-stretch !gap-5"
	>
		<div class="grid grid-cols-2 gap-3">
			<Stat title="In escrow" value="₺24.500" description="Across 3 orders" />
			<Stat title="Awaiting refund" value="₺0" loading />
		</div>
		<div class="flex flex-wrap items-center gap-5">
			<Spinner size={16} />
			<Spinner size={24} />
			<Spinner size={36} color="primary" />
			<span class="bg-ink text-sand grid size-12 place-items-center rounded-full">
				<Spinner size={20} />
			</span>
			<Button loading>Kaydediliyor</Button>
			<Button variant="secondary" loading>Gönderiliyor</Button>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<div class="overflow-hidden rounded-md">
				<Image
					src="/kit-demo-missing.jpg"
					alt="Silinmiş fotoğraf"
					width={120}
					height={120}
				/>
			</div>
			<span class="text-muted-foreground text-sm">A photo whose file is gone.</span>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="StickyActionBar"
		note="#ui/wrapped/StickyActionBar.svelte — pinned to the bottom of the phone screen in real use; shown in place here"
		class="!items-stretch"
	>
		<div class="border-line w-full overflow-hidden rounded-md border">
			<StickyActionBar
				spacer={false}
				desktop="inline"
				class="!static lg:!border-t lg:!bg-paper lg:!px-4 lg:!py-3"
			>
				<div class="flex min-w-0 flex-col">
					<span class="type-meta text-primary truncate text-xl font-bold leading-tight"
						>₺10.000</span
					>
					<span class="text-muted-foreground truncate text-xs">+ ₺89,90 kargo</span>
				</div>
				<div class="ml-auto flex shrink-0 gap-2">
					<Button variant="outline">Teklif ver</Button>
					<Button>Satın al</Button>
				</div>
			</StickyActionBar>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Dates"
		note="#ui/lib/date.ts — formatDate(date, shape) and formatRelativeDate(date). One name per shape."
		ground="paper"
		wide
		class="!items-start !gap-8"
	>
		<KeyValueList
			layout="columns"
			items={(Object.keys(DATE_FORMATS) as DateFormat[]).map((shape) => ({
				label: shape,
				value: formatDate(now, shape)
			}))}
		/>
		<KeyValueList
			layout="columns"
			items={RELATIVE.map((minutes) => ({
				label: formatDate(ago(minutes), 'dayTimeYear'),
				value: formatRelativeDate(ago(minutes), now)
			}))}
		/>
	</KitSpecimen>
	<!-- Shared pieces added after the kit's first pass. -->
	<MoreBlocksSpecimens />
</KitSection>
