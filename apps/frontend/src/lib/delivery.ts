// The delivery platforms' names and how their figures are written: the one place for both.

export const DELIVERY_PLATFORMS: Record<string, string> = {
	wolt: 'Wolt',
	lieferando: 'Lieferando',
	uber_eats: 'Uber Eats'
};

export const deliveryPlatform = (platform: string) => DELIVERY_PLATFORMS[platform] ?? platform;

/** `€10.50` */
export const money = (amount: number, currency = 'EUR') =>
	new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);

/** `20–40 min`, `35 min` */
export const etaLabel = (min?: number, max?: number) =>
	min === undefined ? undefined : max !== undefined && max !== min ? `${min}–${max} min` : `${min} min`;
