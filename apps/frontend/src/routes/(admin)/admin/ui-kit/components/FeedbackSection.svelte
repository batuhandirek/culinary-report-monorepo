<script lang="ts">
	import { Clock, Heart, ShieldCheck, Truck } from '@lucide/svelte';

	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import { notificationManager } from '#ui/lib/notification-manager.js';
	import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';
	import { Skeleton } from '#ui/primitives-new/skeleton/index.js';
	import { Spinner } from '#ui/primitives-new/spinner/index.js';
	import Alert from '#ui/wrapped/Alert.svelte';
	import Avatar from '#ui/wrapped/Avatar.svelte';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Tooltip from '#ui/wrapped/Tooltip.svelte';

	const BADGES: BadgeVariant[] = [
		'default',
		'primary',
		'secondary',
		'success',
		'warning',
		'destructive',
		'outline',
		'quiet',
		'tint'
	];

	let chips = $state(['İstanbul', '₺500 – ₺2.500', 'Sıfır gibi']);

	const toast = {
		success: () =>
			notificationManager.addNotification({ success: true, title: 'Teklifin gönderildi' }),
		error: () =>
			notificationManager.addNotification({
				error: true,
				title: 'Gönderilemedi',
				text: 'Bağlantını kontrol edip tekrar dene.'
			}),
		warning: () =>
			notificationManager.addNotification({
				warning: true,
				title: 'İlanının süresi yarın doluyor',
				text: 'Yayında kalması için süresini uzatabilirsin.'
			}),
		info: () => notificationManager.addNotification({ info: true, title: 'Yeni sürüm hazır' }),
		plain: () => notificationManager.addNotification({ title: 'Bağlantı kopyalandı' }),
		undo: () =>
			notificationManager.addNotification({
				success: true,
				title: 'Favorilerden çıkarıldı',
				action: {
					label: 'Geri al',
					onClick: () =>
						notificationManager.addNotification({ success: true, title: 'Geri alındı' })
				}
			}),
		long: () =>
			notificationManager.addNotification({
				error: true,
				title: 'Kişisel verilerin korunmasına ilişkin onayın olmadan devam edemiyoruz',
				text: 'Hesap ayarlarından izinlerini güncelledikten sonra ödeme adımına yeniden dönebilirsin; sepetin bu sürede saklanır.'
			})
	};
</script>

<KitSection
	id="feedback"
	title="Status and feedback"
	description="A badge names a state, an alert explains one, a toast reports what just happened. Colour is semantic and sparing: success green, warning amber, destructive red — everything else is ink on paper.">
	<KitSpecimen label="Badge · variants" note="#ui/wrapped/Badge.svelte" stack class="items-start">
		<div class="flex flex-wrap items-center gap-2">
			{#each BADGES as variant (variant)}
				<Badge {variant}>{variant}</Badge>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#each BADGES as variant (variant)}
				<Badge {variant} sm pill>{variant}</Badge>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Badge variant="success" dotted>Yayında</Badge>
			<Badge variant="warning" dotted>İnceleniyor</Badge>
			<Badge variant="destructive" dotted>Reddedildi</Badge>
			<Badge variant="outline" icon={Clock}>3 gün kaldı</Badge>
			<Badge variant="success" icon={ShieldCheck}>Kimliği doğrulandı</Badge>
			<Badge variant="outline" loading>Güncelleniyor</Badge>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Badge · pixel and chip"
		note="`pixel`: a short status in Press Start 2P. `chip`: an applied filter you can take off."
		class="flex-col items-start">
		<div class="flex flex-wrap items-center gap-2">
			<Badge pixel variant="outline">Bugün</Badge>
			<Badge pixel variant="tint">Süresi doldu</Badge>
			<Badge pixel variant="secondary">Satıldı</Badge>
			<Badge pixel variant="success">Teslim edildi</Badge>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#each chips as chip (chip)}
				<Badge
					chip
					variant="tint"
					close
					onClose={() => (chips = chips.filter((c) => c !== chip))}>
					{chip}
				</Badge>
			{:else}
				<Button
					variant="link"
					size="sm"
					onclick={() => (chips = ['İstanbul', '₺500 – ₺2.500', 'Sıfır gibi'])}>
					Filtreleri geri getir
				</Button>
			{/each}
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Alert"
		note="#ui/wrapped/Alert.svelte — the ground carries the state"
		wide
		class="grid grid-cols-1 items-start md:grid-cols-2">
		<Alert
			info
			title="Kargo kodun hazır"
			description="Paketi 3 iş günü içinde kargoya teslim et." />
		<Alert
			success
			title="Ödemen alındı"
			description="Satıcıya haber verdik; kargo bilgisi gelince sana yazacağız." />
		<Alert
			warning
			title="Kimliğini doğrulaman gerekiyor"
			description="Satış yapabilmek için e-Devlet ile kimliğini doğrula. İki dakikanı alır." />
		<Alert
			error
			title="Ödeme tamamlanamadı"
			description="Kartından tutar çekilmedi. Bilgilerini kontrol edip tekrar deneyebilirsin." />
		<Alert warning description="Başlıksız, tek satırlık bir not." />
		<Alert info title="Yalnızca başlık" />
	</KitSpecimen>

	<KitSpecimen
		label="Toasts"
		note="notificationManager.addNotification — one paper card for every kind; an exact undo rides on the success toast">
		<Button variant="outline" size="sm" onclick={toast.success}>Success</Button>
		<Button variant="outline" size="sm" onclick={toast.error}>Error + text</Button>
		<Button variant="outline" size="sm" onclick={toast.warning}>Warning</Button>
		<Button variant="outline" size="sm" onclick={toast.info}>Info</Button>
		<Button variant="outline" size="sm" onclick={toast.plain}>Plain</Button>
		<Button variant="outline" size="sm" onclick={toast.undo}>With undo</Button>
		<Button variant="outline" size="sm" onclick={toast.long}>Long text</Button>
	</KitSpecimen>

	<KitSpecimen
		label="Skeleton · spinner"
		note="A skeleton shaped like the content beats a spinner mid-page"
		stack>
		<div class="flex items-center gap-3">
			<Skeleton class="size-12 shrink-0 rounded-full" />
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-2/3" />
				<Skeleton class="h-3 w-1/3" />
			</div>
		</div>
		<div class="bg-paper border-line flex items-center gap-3 rounded-md border p-3">
			<Skeleton class="size-16 shrink-0" />
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-3/4" />
				<Skeleton class="h-4 w-20" />
			</div>
		</div>
		<div class="flex items-center gap-4">
			<Spinner />
			<Spinner class="size-6" />
			<Spinner class="text-primary-darker size-8" />
			<span class="text-muted-foreground inline-flex items-center gap-2 text-sm">
				<Spinner /> Yükleniyor…
			</span>
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Avatar"
		note="#ui/wrapped/Avatar.svelte — the photo, or a pattern seeded from `identifier`">
		<Avatar alt="Ayşe" size={24} identifier="ayse" />
		<Avatar alt="Batuhan" size={32} identifier="batuhan" />
		<Avatar alt="Cem" size={40} identifier="cem" />
		<Avatar alt="Deniz" size={56} identifier="deniz" />
		<Avatar alt="Ece" size={56} identifier="ece" variant="rounded" />
		<Avatar alt="Fatma" size={72} identifier="fatma" />
	</KitSpecimen>

	<KitSpecimen
		label="Tooltip"
		note="#ui/wrapped/Tooltip.svelte — desktop only; never the only place a fact lives">
		<Tooltip text="Favorilere ekle">
			<IconButton icon={Heart} variant="outline" circle aria-label="Favorilere ekle" />
		</Tooltip>
		<Tooltip text="Satıcı kargoyu genelde 2 günde veriyor" side="top">
			<Badge variant="outline" icon={Truck}>2 günde kargoda</Badge>
		</Tooltip>
		<Tooltip text="Sağda" side="right">
			<span class="text-sm underline decoration-dotted underline-offset-4">Üzerine gel</span>
		</Tooltip>
	</KitSpecimen>
</KitSection>
