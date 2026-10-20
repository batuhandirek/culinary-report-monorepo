import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Note } from '../components/Note';
import { Quote } from '../components/Quote';
import { B, P, Small, TextLink, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

export type ReviewAlertLanguage = 'en' | 'de';

export interface ReviewAlertEmailProps {
	language: ReviewAlertLanguage;
	venueName: string;
	/** Whom we write to; the greeting is general without one. */
	contactName?: string | null;
	stars: number;
	/** ISO date the review was published */
	publishedAt: string;
	/** The guest's own words */
	text: string;
	/** Google's English translation, shown under an English mail when the review is in another language */
	translation?: string | null;
	/** A reply to post, in the review's language; the mail goes without one when drafting failed */
	draft?: string | null;
	/** The venue's Google Maps page, where the reply is posted */
	googleUrl?: string | null;
	/** The portal's Reviews tab */
	portalUrl: string;
	appUrl?: string;
}

const dayName = (iso: string, language: ReviewAlertLanguage) =>
	new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Berlin',
	}).format(new Date(iso));

const COPY = {
	en: {
		subject: (venue: string, stars: number) =>
			`${venue}: a ${stars}-star review to answer`,
		title: (stars: number) => `A ${stars}-star review came in`,
		greeting: (name?: string | null) => (name ? `Hi ${name},` : 'Hello,'),
		intro: (venue: string, day: string) => (
			<>
				<B>{venue}</B> got a new Google review on {day}. An answer within a few days shows the
				next guest reading it that you listen.
			</>
		),
		from: (stars: number, day: string) => `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} · ${day}`,
		translation: 'In English:',
		draft: 'A reply you could post',
		draftHint: 'Change what you like, then post it under the review on Google.',
		button: 'Answer on Google',
		portal: 'All your reviews, with a draft for each unanswered one:',
		portalLink: 'open your portal',
		stop: 'No longer want these alerts? Reply “stop” and we won’t send them again.',
		reason: (venue: string) =>
			`You got this e-mail because ${venue} receives the Culinary Report review alerts.`,
	},
	de: {
		subject: (venue: string, stars: number) =>
			`${venue}: eine ${stars}-Sterne-Bewertung zum Beantworten`,
		title: (stars: number) => `Eine ${stars}-Sterne-Bewertung ist eingegangen`,
		greeting: (name?: string | null) => (name ? `Hallo ${name},` : 'Guten Tag,'),
		intro: (venue: string, day: string) => (
			<>
				<B>{venue}</B> hat am {day} eine neue Google-Bewertung bekommen. Eine Antwort innerhalb
				weniger Tage zeigt dem nächsten Gast, der sie liest, dass Sie zuhören.
			</>
		),
		from: (stars: number, day: string) => `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} · ${day}`,
		translation: null,
		draft: 'Eine Antwort, die Sie posten könnten',
		draftHint: 'Ändern Sie, was Sie möchten, und posten Sie sie unter der Bewertung auf Google.',
		button: 'Auf Google antworten',
		portal: 'Alle Ihre Bewertungen, mit einem Entwurf für jede unbeantwortete:',
		portalLink: 'Portal öffnen',
		stop: 'Sie möchten keine Hinweise mehr? Antworten Sie mit „Stopp“, dann schicken wir keine mehr.',
		reason: (venue: string) =>
			`Sie erhalten diese E-Mail, weil ${venue} die Bewertungs-Hinweise von Culinary Report bekommt.`,
	},
} satisfies Record<ReviewAlertLanguage, unknown>;

/** The subject line of a review alert, in the recipient's language. */
export const reviewAlertSubject = (
	props: Pick<ReviewAlertEmailProps, 'language' | 'venueName' | 'stars'>,
) => COPY[props.language].subject(props.venueName, props.stars);

// The weekly review watch found a critical review (three stars or fewer) of a venue that
// subscribed: the review, a reply draft and where to post it. A business contact with no
// account, like the report mail: replying "stop" opts them out by hand.
export const ReviewAlertEmail = ({
	language,
	venueName,
	contactName,
	stars,
	publishedAt,
	text,
	translation,
	draft,
	googleUrl,
	portalUrl,
	appUrl = DEFAULT_APP_URL,
}: ReviewAlertEmailProps) => {
	const copy = COPY[language];
	const day = dayName(publishedAt, language);
	return (
		<Layout appUrl={appUrl} lang={language} preview={text.slice(0, 120)} reason={copy.reason(venueName)}>
			<Title>{copy.title(stars)}</Title>
			<P>{copy.greeting(contactName)}</P>
			<P>{copy.intro(venueName, day)}</P>
			<Quote from={copy.from(stars, day)}>{text}</Quote>
			{copy.translation && translation && translation !== text && (
				<P muted>
					{copy.translation} {translation}
				</P>
			)}
			{draft && (
				<>
					<P>
						<B>{copy.draft}</B>
					</P>
					<Note>{draft}</Note>
					<Small>{copy.draftHint}</Small>
				</>
			)}
			{googleUrl && <Button href={googleUrl}>{copy.button}</Button>}
			<Small>
				{copy.portal} <TextLink href={portalUrl}>{copy.portalLink}</TextLink>
			</Small>
			<Small>{copy.stop}</Small>
		</Layout>
	);
};

ReviewAlertEmail.PreviewProps = {
	language: 'en',
	venueName: 'Imbiss Olympische Brücke',
	contactName: 'Mehmet',
	stars: 2,
	publishedAt: '2026-10-14T18:20:00Z',
	text: 'Das Fleisch war trocken und wir haben 25 Minuten gewartet.',
	translation: 'The meat was dry and we waited 25 minutes.',
	draft:
		'Danke für Ihre ehrliche Rückmeldung. 25 Minuten sind zu lang, und trockenes Fleisch soll bei uns nicht passieren. Wir schauen uns das in der Küche an und würden uns freuen, Sie bald wieder zu sehen.',
	googleUrl: 'https://maps.google.com/?cid=1',
	portalUrl: 'https://culinaryreport.com/portal/venue-id/reviews',
} satisfies ReviewAlertEmailProps;

export default ReviewAlertEmail;
