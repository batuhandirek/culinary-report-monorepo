import type { AdminProspectOutputDto } from 'client';

import type { OutreachLanguage, OutreachTemplate } from '#constants/OUTREACH_TEMPLATES.js';

// Fills the templates in `OUTREACH_TEMPLATES.ts`; the syntax is described there.

/** A plain value, or a count with its written form (`{ count: 591030, text: '591k' }`). */
export type TemplateValue = string | { count: number; text: string } | null | undefined;
export type TemplateVars = Record<string, TemplateValue>;

const VARIABLE = /\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g;
const BLOCK = /\[\[([\s\S]*?)\]\]/g;

const present = (value: TemplateValue) =>
	typeof value === 'string' ? value.trim() !== '' : !!value && value.count > 0;

const written = (value: TemplateValue) => (typeof value === 'string' ? value : (value?.text ?? ''));

/** The text with its variables filled, and the names of those that had no value. */
export const fillTemplate = (template: string, vars: TemplateVars) => {
	const withBlocks = template.replace(BLOCK, (_, block: string) =>
		[...block.matchAll(VARIABLE)].every(([, name]) => present(vars[name])) ? block : ''
	);
	const missing = new Set<string>();
	const text = withBlocks.replace(VARIABLE, (_, name: string, one?: string, other?: string) => {
		const value = vars[name];
		if (!present(value)) {
			missing.add(name);
			return `[${name}]`;
		}
		if (one === undefined || other === undefined) return written(value);
		const count = typeof value === 'string' ? Number(value) : value!.count;
		return (count === 1 ? one : other).replaceAll('#', written(value));
	});
	return {
		text: text
			.replace(/[ \t]{2,}/g, ' ')
			.replace(/\n{3,}/g, '\n\n')
			.trim(),
		missing: [...missing]
	};
};

/** "Choc-Spot - Desserts, Coffee and more" → "Choc-Spot": the name without Google's tagline. */
export const shortVenueName = (name: string) => name.split(/\s+[-–|]\s+|\s+\(/)[0].trim() || name;

const LOCALES: Record<OutreachLanguage, string> = { en: 'en-GB', de: 'de-DE' };

const monthName = (month: string, language: OutreachLanguage) =>
	new Intl.DateTimeFormat(LOCALES[language], { month: 'long', timeZone: 'UTC' }).format(
		new Date(`${month}-01T00:00:00Z`)
	);

/** Big numbers the way people say them: 591k, 163k, 1.7M (German: 591.000, 1,7 Mio.). */
export const compactCount = (count: number, language: OutreachLanguage = 'en') =>
	language === 'de'
		? new Intl.NumberFormat('de-DE', { notation: 'compact', maximumSignificantDigits: 3 }).format(
				count
			)
		: new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 })
				.format(count)
				.replace(/K$/, 'k');

const counted = (count: number | undefined, language: OutreachLanguage, compact = false) =>
	count
		? {
				count,
				text: compact
					? compactCount(count, language)
					: new Intl.NumberFormat(LOCALES[language]).format(count)
			}
		: undefined;

/** Everything a template can say about this prospect, in its language. */
export const outreachVars = (
	prospect: AdminProspectOutputDto,
	language: OutreachLanguage,
	sender: string
): TemplateVars => {
	const report = prospect.latestReport;
	const venue = shortVenueName(prospect.brand.name);
	const firstName = prospect.contactName?.trim().split(/\s+/)[0];
	const greeting =
		language === 'de'
			? firstName
				? `Hallo ${firstName},`
				: `Hallo Team von ${venue},`
			: firstName
				? `Hi ${firstName},`
				: `Hi ${venue} team,`;
	return {
		greeting,
		venue,
		hook: prospect.hook,
		headline: report?.headline,
		month: report ? monthName(report.month, language) : undefined,
		city: prospect.city,
		creators: counted(report?.creators, language),
		posts: counted(report?.posts, language),
		views: counted(report?.views, language, true),
		reviews: counted(report?.reviews, language),
		sender: sender.trim()
	};
};

/** The template that fits where the conversation stands. */
export const suggestedTemplateKey = (prospect: AdminProspectOutputDto) => {
	switch (prospect.stage) {
		case 'TO_CONTACT':
			return 'intro';
		case 'CONTACTED':
			return prospect.outreachCount <= 1 ? 'follow-up' : 'last-try';
		default:
			return 'report';
	}
};

export const gmailComposeUrl = (to: string, subject: string, body: string) =>
	`https://mail.google.com/mail/?${new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body })}`;

/** Gmail's search for what was sent to them, to reply in that thread. */
export const gmailThreadUrl = (to: string) =>
	`https://mail.google.com/mail/#search/${encodeURIComponent(`to:${to}`)}`;

export const mailtoUrl = (to: string, subject: string, body: string) =>
	`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle}/`;

/** Subject and body of a template for this prospect, with what is still missing. */
export const draftFrom = (template: OutreachTemplate, vars: TemplateVars, language: OutreachLanguage) => {
	const subject = template.subject ? fillTemplate(template.subject[language], vars) : undefined;
	const body = fillTemplate(template.body[language], vars);
	return {
		subject: subject?.text ?? '',
		body: body.text,
		missing: [...new Set([...(subject?.missing ?? []), ...body.missing])]
	};
};
