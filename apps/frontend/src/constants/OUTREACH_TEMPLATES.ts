// The messages the outreach composer starts from. Edit the copy here; the composer fills in
// the prospect, and anything can still be changed by hand before sending.
//
// Variables:
//   {greeting}  "Hi Anna," or "Hi Döner Pro team,"
//   {venue}     the venue's name, without the tagline Google adds ("Choc-Spot", not
//               "Choc-Spot - Desserts, Coffee and more")
//   {hook}      the prospect's "lead with" line: one finding from their report
//   {headline}  the report's one-sentence summary (written in English)
//   {month}     the report's month: "September"
//   {city}      the venue's city: "Berlin"
//   {creators} {posts} {views} {reviews}   from the report; zero counts as no value
//   {sender}    the name you sign with
// Plurals: {creators|one creator|# creators} picks the first form for 1 and the second
// otherwise, with # as the number.
// [[ … ]] is kept only when every variable inside has a value.
// A variable without a value stays in the text as [variable], and the composer lists it.
//
// Each template's `key` is stored with every message sent from it, to compare which copy
// gets answers: give a rewrite a new key rather than reusing one.

export type OutreachLanguage = 'en' | 'de';

export interface OutreachTemplate {
	key: string;
	name: string;
	/** When to use it, shown under the picker. */
	when: string;
	/** What sending it adds to the log. */
	kind: 'EMAIL' | 'DM' | 'CALL';
	/** An email that starts a thread, or one sent as a reply in the last one's thread. */
	thread?: 'new' | 'reply';
	/** Offers the report's PDF to attach. */
	attachReport?: boolean;
	subject?: Record<OutreachLanguage, string>;
	body: Record<OutreachLanguage, string>;
}

const SIGNATURE = `{sender}
Culinary Report · culinaryreport.com`;

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
	{
		key: 'intro',
		name: 'First email',
		when: 'The first message. No attachment and no link: asking first gets more replies and stays out of spam.',
		kind: 'EMAIL',
		thread: 'new',
		subject: {
			en: '{venue}: your {month} on TikTok',
			de: '{venue}: euer {month} auf TikTok'
		},
		body: {
			en: `{greeting}

[[In {month}, {creators|one creator|# creators} posted about {venue}, with {views} views in total. ]]I looked at what TikTok, Instagram and your Google reviews say about you and put it into a one-page report.

One thing stood out: {hook}

The report is ready, and it's free. It shows which posts got you the most attention, what guests praise, and what keeps them from giving 5 stars. Shall I send it over?

${SIGNATURE}

P.S. Not for you? Just say so and I won't write again.`,
			de: `{greeting}

[[Im {month} {creators|hat ein Creator|haben # Creator} über {venue} gepostet, mit zusammen {views} Aufrufen. ]]Ich habe mir angesehen, was auf TikTok, Instagram und in euren Google-Bewertungen über euch gesagt wird, und alles in einem einseitigen Bericht zusammengefasst.

Eine Sache ist mir aufgefallen: {hook}

Der Bericht (auf Englisch) ist fertig und kostenlos. Er zeigt, welche Posts euch die meiste Aufmerksamkeit gebracht haben, was Gäste loben und was sie von 5 Sternen abhält. Soll ich ihn euch schicken?

${SIGNATURE}

P.S. Kein Interesse? Sagt einfach kurz Bescheid, dann schreibe ich nicht mehr.`
		}
	},
	{
		key: 'report',
		name: 'Send the report',
		when: 'After they say yes, or after a call. Download the PDF below and attach it.',
		kind: 'EMAIL',
		thread: 'new',
		attachReport: true,
		subject: {
			en: '{venue}: your {month} report',
			de: '{venue}: euer Bericht für {month}'
		},
		body: {
			en: `{greeting}

As promised, here's the {month} report for {venue} (PDF attached).

In one sentence: {headline}

It also suggests two or three things to try next month. If it's useful, I can send you one every month, with how you compare to the places around you.

Do you have 15 minutes this week or next for a quick call? I'll walk you through it.

${SIGNATURE}`,
			de: `{greeting}

Wie versprochen hier der {month}-Bericht für {venue} (PDF im Anhang). Er ist auf Englisch; Fragen beantworte ich gern auf Deutsch.

Kurz zusammengefasst: {hook}

Außerdem schlägt er zwei, drei Dinge vor, die ihr im nächsten Monat ausprobieren könnt. Wenn er euch nützt, schicke ich euch jeden Monat einen, auch mit dem Vergleich zu den Läden in eurer Nähe.

Habt ihr diese oder nächste Woche 15 Minuten für ein kurzes Gespräch? Dann gehe ich ihn mit euch durch.

${SIGNATURE}`
		}
	},
	{
		key: 'follow-up',
		name: 'Follow-up',
		when: 'When the first email got no answer; the log sets the date (4 days later). Send it as a reply in the same thread.',
		kind: 'EMAIL',
		thread: 'reply',
		body: {
			en: `{greeting}

A quick nudge in case my note got buried in a busy week. The report on {venue} is ready: reply "yes" and I'll send it over, no strings attached.

{sender}`,
			de: `{greeting}

Ich hake kurz nach, falls meine Nachricht in einer vollen Woche untergegangen ist. Der Bericht über {venue} ist fertig: Antwortet einfach mit „Ja“, dann schicke ich ihn euch, ganz unverbindlich.

{sender}`
		}
	},
	{
		key: 'last-try',
		name: 'Last try',
		when: 'A week after the follow-up, if it is still quiet. Reply in the same thread. After this, mark them lost or set a date to try again.',
		kind: 'EMAIL',
		thread: 'reply',
		body: {
			en: `{greeting}

I don't want to clutter your inbox, so this is my last note. If a monthly look at what TikTok, Instagram and your Google reviews say about {venue} would help, reply "yes" and the report is yours. If the timing's wrong, reply "later" and I'll check back in a few months.

All the best,
{sender}`,
			de: `{greeting}

Ich möchte euer Postfach nicht vollschreiben, deshalb ist das meine letzte Nachricht. Wenn euch ein monatlicher Überblick hilft, was auf TikTok, Instagram und in euren Google-Bewertungen über {venue} gesagt wird, antwortet mit „Ja“, und der Bericht gehört euch. Passt es gerade nicht, schreibt „später“, dann melde ich mich in ein paar Monaten wieder.

Alles Gute
{sender}`
		}
	},
	{
		key: 'dm',
		name: 'Instagram DM',
		when: 'When there is no email address, or as a second channel. Keep it short and offer the PDF by email.',
		kind: 'DM',
		body: {
			en: `Hi! I'm {sender} from Culinary Report: we track what creators and Google reviewers say about restaurants in {city}. [[In {month}, {creators|one creator|# creators} posted about {venue} ({views} views). ]]I made you a free one-page report, and one thing stood out: {hook}

Want it? Send me an email address and I'll send you the PDF.`,
			de: `Hallo! Ich bin {sender} von Culinary Report: Wir werten aus, was Creator und Google-Bewertungen über Restaurants in {city} sagen. [[Im {month} {creators|hat ein Creator|haben # Creator} über {venue} gepostet ({views} Aufrufe). ]]Ich habe euch dazu einen kostenlosen einseitigen Bericht gemacht, und eine Sache ist mir aufgefallen: {hook}

Interesse? Schickt mir eine E-Mail-Adresse, dann bekommt ihr das PDF.`
		}
	},
	{
		key: 'call',
		name: 'Phone call',
		when: 'Call between 15:00 and 17:00, between lunch and dinner. Asking "Can I email it?" also gets you their OK to email, which German law (UWG §7) asks for before a promotional email.',
		kind: 'CALL',
		body: {
			en: `Hi, is this {venue}? My name is {sender}, from Culinary Report here in {city}. Do you have a minute? (Busy? Ask when is better, and log the call with that time.)

We track what TikTok creators and Google reviewers say about restaurants in {city}. [[In {month}, {creators|one creator|# creators} posted about you, with {views} views in total. ]]I've made a free one-page report on it.

One thing that stood out: {hook}

Can I email it to you? Who should I send it to?

(Write down the name and the address, then log the call.)`,
			de: `Hallo, spreche ich mit {venue}? Mein Name ist {sender}, von Culinary Report hier in {city}. Haben Sie eine Minute? (Keine Zeit? Fragen, wann es besser passt, und den Anruf mit der Uhrzeit eintragen.)

Wir werten aus, was TikTok-Creator und Google-Bewertungen über Restaurants in {city} sagen. [[Im {month} {creators|hat ein Creator|haben # Creator} über Sie gepostet, mit zusammen {views} Aufrufen. ]]Dazu habe ich einen kostenlosen einseitigen Bericht erstellt.

Eine Sache ist mir aufgefallen: {hook}

Darf ich Ihnen den Bericht per E-Mail schicken? An wen schicke ich ihn am besten?

(Name und Adresse notieren, dann den Anruf eintragen.)`
		}
	}
];

export const findOutreachTemplate = (key: string) =>
	OUTREACH_TEMPLATES.find((template) => template.key === key);
