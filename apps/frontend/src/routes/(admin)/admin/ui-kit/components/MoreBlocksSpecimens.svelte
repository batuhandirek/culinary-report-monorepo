<script lang="ts">
	import { Bell, Mail, Megaphone } from '@lucide/svelte';

	import KitSpecimen from './KitSpecimen.svelte';

	import ProseSheet from '#components/ProseSheet.svelte';
	import Stat from '#ui/components/Stat.svelte';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Panel from '#ui/wrapped/Panel.svelte';
	import Section from '#ui/wrapped/Section.svelte';
	import SwitchRow from '#ui/wrapped/SwitchRow.svelte';

	/**
	 * Specimens for the shared pieces added after the kit's first pass: `Section`, the
	 * compact `Stat`, the quiet `Badge`, `SwitchRow`, `ProseSheet` and
	 * `Image` with `widths`. Mounted at the end of the Blocks section.
	 */

	// SwitchRow reports a change and shows what it is told: these stand in for the save.
	let push = $state(true);
	let email = $state(false);
</script>

<KitSpecimen
	label="Section"
	note="#ui/wrapped/Section.svelte — the ruled head (`section-rule`) over a body: count, note, a trailing link or an action of your own"
	wide
	stack
>
	<Section title="Yeni eklenenler" href="/kesfet" size="lg">
		<p class="text-muted-foreground m-0 text-sm">Başlık, sonda “Tümü” bağlantısı.</p>
	</Section>
	<Section title="İlanların" count={3}>
		<p class="text-muted-foreground m-0 text-sm">Piksel rakamla sayı.</p>
	</Section>
	<Section title="Yazılar" note="12 yazı" href="/blog" linkText="Tüm yazılar">
		<p class="text-muted-foreground m-0 text-sm">Sessiz not ve kendi bağlantı metni.</p>
	</Section>
	<Section title="Çok uzun bir bölüm başlığı satıra sığmadığında ne olur" level={3}>
		{#snippet action()}
			<Button variant="outline" size="sm">Düzenle</Button>
		{/snippet}
		<p class="text-muted-foreground m-0 text-sm">
			Üçüncü düzey başlık ve kendi `action` içeriği.
		</p>
	</Section>
</KitSpecimen>

<KitSpecimen
	label="Stat · sm"
	note="#ui/components/Stat.svelte — `size=&quot;sm&quot;` is the compact tile of a dashboard rail; `hint` sits beside the figure"
	class="!items-stretch"
>
	<div class="grid w-full grid-cols-3 gap-2">
		<Stat size="sm" title="Satışta" value={2} href="/panel" />
		<Stat size="sm" title="Açık teklif" value={0} href="/panel" />
		<Stat size="sm" title="Yolda" value="₺9.500" hint="3 satıştan" href="/panel" />
	</div>
</KitSpecimen>

<KitSpecimen
	label="Badge · quiet"
	note="variant=&quot;quiet&quot; — a state that asks nothing of the reader, beside the ones that do"
	ground="paper"
>
	<Badge variant="warning">Sıra sende</Badge>
	<Badge variant="quiet">Alıcının yanıtı bekleniyor</Badge>
	<Badge variant="quiet" dotted>Teklifin süresi doldu</Badge>
	<Badge variant="secondary">secondary, for contrast</Badge>
</KitSpecimen>

<KitSpecimen
	label="SwitchRow"
	note="#ui/wrapped/SwitchRow.svelte — one on/off setting; the whole row is the label. Several in a `Panel rows`."
	class="!items-stretch"
>
	<Panel rows class="w-full">
		<SwitchRow
			icon={Bell}
			title="Anlık bildirimler"
			hint="Teklif, mesaj ve sipariş adımlarını telefonuna bildiririz."
			checked={push}
			onChange={(value) => (push = value)}
		/>
		<SwitchRow
			icon={Mail}
			title="E-posta"
			hint="Aynı gelişmeler e-posta kutuna da düşer."
			checked={email}
			onChange={(value) => (email = value)}
		/>
		<SwitchRow icon={Megaphone} title="Kaydediliyor" checked loading onChange={() => {}} />
		<SwitchRow title="Kapalı ve değiştirilemez" checked={false} disabled onChange={() => {}} />
	</Panel>
</KitSpecimen>

<KitSpecimen
	label="ProseSheet"
	note="#components/ProseSheet.svelte — bare markup set by element (`/s/*`, `/legal/*`); a designed block inside goes in `.not-prose`"
	ground="paper"
	class="!items-stretch"
>
	<ProseSheet class="max-w-prose">
		<h1>Nasıl çalışır?</h1>
		<p>
			Fotoğrafını çek, ilanını biz hazırlayalım. Ödeme, ürün alıcının eline ulaşana kadar
			güvende bekler.
		</p>
		<h2>Satıcı için</h2>
		<ul>
			<li>Ürünün fotoğrafını çek.</li>
			<li>Hazırlanan ilanı gözden geçir ve yayınla.</li>
		</ul>
		<div class="not-prose">
			<Button variant="outline">`.not-prose` içinde bir düğme</Button>
		</div>
	</ProseSheet>
</KitSpecimen>
