<script lang="ts" module>
	// The steps that spend money, with the default cap a city falls back to
	export const BUDGETED_STEPS = [
		{ key: 'SCRAPE_VENUES', label: 'Scrape venues', fallback: 20 },
		{ key: 'SEARCH_BRANCHES', label: 'Search brand branches', fallback: 2 },
		{ key: 'LOOKUP_OSM_PLACES', label: 'Look up OSM places', fallback: 10 },
		{ key: 'SCRAPE_TIKTOK', label: 'Scrape TikTok', fallback: 7 },
		{ key: 'SCRAPE_TIKTOK_RECENT', label: 'TikTok, weekly', fallback: 6 },
		{ key: 'SCRAPE_INSTAGRAM', label: 'Scrape Instagram', fallback: 8 },
		{ key: 'SCRAPE_INSTAGRAM_RECENT', label: 'Instagram, daily', fallback: 2 },
		{ key: 'SCRAPE_INSTAGRAM_REELS', label: 'Instagram reels, weekly', fallback: 1 },
		{ key: 'LOOKUP_VENUES', label: 'Look up venues', fallback: 6 },
		{ key: 'SCRAPE_VENUE_SOCIAL', label: 'Scrape venue posts', fallback: 8 },
		{ key: 'SCRAPE_REVIEWS', label: 'Scrape reviews', fallback: 12 },
		{ key: 'REFRESH_VENUE_DETAILS', label: 'Refresh venue details', fallback: 2 },
		{ key: 'SCRAPE_ACCOUNTS', label: 'Watched accounts, monthly', fallback: 4 },
		{ key: 'SCRAPE_ACCOUNTS_RECENT', label: 'Watched accounts, weekly', fallback: 2 },
		{ key: 'FIND_OWN_ACCOUNTS', label: 'Own accounts on the other platform, weekly', fallback: 1 },
		{ key: 'SCRAPE_COMMENTS', label: 'Scrape comments', fallback: 13 },
		{ key: 'SCRAPE_PRESS', label: 'Scrape press', fallback: 3 },
		{ key: 'SCRAPE_DELIVERY', label: 'Scrape delivery', fallback: 3 },
		{ key: 'SAMPLE_BUSYNESS', label: 'Sample busyness', fallback: 1 },
		{ key: 'SAMPLE_RESERVATIONS', label: 'Sample open tables', fallback: 1 },
		{ key: 'SNAPSHOT_RATINGS', label: 'Snapshot ratings, twice a week', fallback: 3 },
		{ key: 'TRACK_SEARCH_RANKS', label: 'Track search ranks', fallback: 3 },
		{ key: 'SEARCH_INTEREST', label: 'Google Trends', fallback: 2 }
	] as const;
</script>

<script lang="ts">
	import type { AdminCityOutputDto, AdminCreateCityInputDto } from 'client';

	import { api } from '#lib/api.js';
	import { districtsToText, textToDistricts } from '#lib/city-districts.js';
	import FormDialog from '#ui/components/FormDialog.svelte';
	import { notificationManager } from '#ui/lib/notification-manager.js';

	interface Props {
		/** The city to edit; none creates one */
		city?: AdminCityOutputDto;
		active?: boolean;
		onSaved: (city: AdminCityOutputDto) => void;
	}

	let { city, active = $bindable(false), onSaved }: Props = $props();

	const required = (label: string) => (value: string) => !!value?.trim() || `${label} is needed`;
	const pattern = (re: RegExp, message: string) => (value: string) =>
		!value || re.test(value.trim()) || message;

	const budgets = $derived(city?.stepBudgetsUsd as Record<string, number> | undefined);

	// Rebuilt from the city, so the dialog always opens on what is saved
	const form = $derived({
		fields: {
			name: {
				type: 'text' as const,
				label: 'Name',
				placeholder: 'München',
				value: city?.name ?? '',
				validation: [required('A name')],
				hint: 'As posts and reports name it. Mentions in another city are told apart by it.',
				col: 6
			},
			slug: {
				type: 'text' as const,
				label: 'Slug',
				placeholder: 'munich',
				value: city?.slug ?? '',
				validation: [
					required('A slug'),
					pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes')
				],
				col: 6
			},
			aliases: {
				type: 'tags' as const,
				label: 'Other names',
				placeholder: 'Munich',
				hint: 'Spellings a post may give the city.',
				value: city?.aliases ?? []
			},
			country: {
				type: 'text' as const,
				label: 'Country',
				placeholder: 'DE',
				value: city?.country ?? '',
				validation: [required('A country'), pattern(/^[A-Z]{2}$/, 'Two capital letters (ISO)')],
				col: 3
			},
			tiktokRegion: {
				type: 'text' as const,
				label: 'TikTok region',
				placeholder: 'DE',
				value: city?.tiktokRegion ?? '',
				validation: [required('A region'), pattern(/^[A-Z]{2}$/, 'Two capital letters (ISO)')],
				col: 3
			},
			language: {
				type: 'text' as const,
				label: 'Language',
				placeholder: 'de',
				value: city?.language ?? '',
				hint: 'Of its reports and outreach.',
				validation: [required('A language'), pattern(/^[a-z]{2}$/, 'Two small letters (ISO)')],
				col: 3
			},
			timezone: {
				type: 'text' as const,
				label: 'Time zone',
				placeholder: 'Europe/Berlin',
				value: city?.timezone ?? '',
				validation: [required('A time zone')],
				col: 3
			},
			locationQuery: {
				type: 'text' as const,
				label: 'Google Maps location',
				placeholder: 'Munich, Germany',
				value: city?.locationQuery ?? '',
				validation: [required('A location')],
				hint: 'Where venue scrapes and name lookups search.',
				col: 6
			},
			topBrands: {
				type: 'number' as const,
				label: 'Report brands',
				min: 1,
				max: 200,
				value: city?.topBrands ?? 20,
				hint: "The month's most talked-about brands that get reviews and reports (subscribers always do).",
				col: 6
			},
			region: {
				type: 'text' as const,
				label: 'Region',
				placeholder: 'DE-BY',
				value: city?.region ?? '',
				validation: [pattern(/^[A-Z]{2}-[A-Z0-9]{1,3}$/, 'ISO 3166-2, e.g. DE-BY')],
				hint: 'Its regional public holidays and the Google Trends region.',
				optional: true,
				col: 6
			},
			lat: {
				type: 'number' as const,
				label: 'Latitude',
				step: 0.0001,
				value: city?.lat,
				hint: 'For the daily weather.',
				optional: true,
				col: 3
			},
			lng: {
				type: 'number' as const,
				label: 'Longitude',
				step: 0.0001,
				value: city?.lng,
				optional: true,
				col: 3
			},
			osmRelationId: {
				type: 'number' as const,
				label: 'OpenStreetMap boundary',
				placeholder: '62422',
				min: 1,
				value: city?.osmRelationId,
				hint: 'The relation id of its boundary on openstreetmap.org (Berlin: 62422). Its food places there are the checklist the venue list is measured against.',
				optional: true,
				col: 6
			},
			nameStopwords: {
				type: 'tags' as const,
				label: 'Words dropped from venue names',
				placeholder: 'münchen',
				hint: 'The city’s own name and local generic words ("imbiss", "lokanta"), so "Monkey Bar München" matches "Monkey Bar".',
				value: city?.nameStopwords ?? []
			},
			chainDenyList: {
				type: 'tags' as const,
				label: 'Chains and institutions',
				placeholder: 'hofbrau',
				hint: 'Names that lose half their lead score: they do not need a report.',
				value: city?.chainDenyList ?? []
			},
			districts: {
				type: 'textarea' as const,
				label: 'Districts',
				rows: 8,
				maxlength: 20000,
				hint: 'One per line: Name | postal codes | neighbouring districts. A border written on one side counts for both.',
				value: districtsToText(city?.districts ?? [])
			},
			...Object.fromEntries(
				BUDGETED_STEPS.map((step) => [
					`budget_${step.key}`,
					{
						type: 'number' as const,
						label: `${step.label} (USD)`,
						min: 0,
						max: 100,
						step: 0.5,
						value: budgets?.[step.key],
						hint: `Empty: $${step.fallback}`,
						optional: true,
						col: 4
					}
				])
			),
			active: {
				type: 'checkbox' as const,
				label: 'Active',
				message: 'The pipeline covers it',
				value: city?.active ?? true,
				col: 4
			},
			cronEnabled: {
				type: 'checkbox' as const,
				label: 'Monthly run',
				message: 'The cron queues its run on the 2nd',
				value: city?.cronEnabled ?? false,
				col: 4
			},
			instagramEnabled: {
				type: 'checkbox' as const,
				label: 'Instagram',
				message: 'Scrape its Instagram hashtags',
				value: city?.instagramEnabled ?? true,
				col: 4
			}
		}
	});

	const num = (value: unknown) =>
		value === '' || value === null || value === undefined || !Number.isFinite(Number(value))
			? undefined
			: Number(value);
</script>

<FormDialog
	bind:active
	{form}
	title={city ? `Edit ${city.name}` : 'New city'}
	submitText={city ? 'Save' : 'Create'}
	cancelText="Cancel"
	class="max-w-[760px]"
	onSubmit={async (values) => {
		const v = values as Record<string, unknown>;
		const stepBudgetsUsd = Object.fromEntries(
			BUDGETED_STEPS.map((step) => [step.key, num(v[`budget_${step.key}`])]).filter(
				([, budget]) => budget !== undefined
			)
		);
		const body: AdminCreateCityInputDto = {
			name: String(v.name).trim(),
			slug: String(v.slug).trim(),
			aliases: v.aliases as string[],
			country: String(v.country).trim(),
			tiktokRegion: String(v.tiktokRegion).trim(),
			language: String(v.language).trim(),
			timezone: String(v.timezone).trim(),
			locationQuery: String(v.locationQuery).trim(),
			topBrands: num(v.topBrands) ?? 20,
			region: String(v.region ?? '').trim() || null,
			lat: num(v.lat) ?? null,
			lng: num(v.lng) ?? null,
			osmRelationId: num(v.osmRelationId) ?? null,
			nameStopwords: v.nameStopwords as string[],
			chainDenyList: v.chainDenyList as string[],
			districts: textToDistricts(String(v.districts ?? '')),
			stepBudgetsUsd,
			active: !!v.active,
			cronEnabled: !!v.cronEnabled,
			instagramEnabled: !!v.instagramEnabled
		};
		const saved = city ? await api.admin.updateCity(city.id, body) : await api.admin.createCity(body);
		onSaved(saved as AdminCityOutputDto);
		notificationManager.addNotification({ title: city ? 'Saved' : 'City created', success: true });
	}} />
