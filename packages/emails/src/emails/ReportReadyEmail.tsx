import * as React from 'react';

import { Block } from '../components/Block';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { B, P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';
import { color, font } from '../theme';

export type ReportMailLanguage = 'en' | 'de';

export interface ReportReadyEmailProps {
	language: ReportMailLanguage;
	venueName: string;
	/** `YYYY-MM` */
	month: string;
	/** Whom we write to; the greeting is general without one. */
	contactName?: string | null;
	/** The report's cover title, headline and findings, as the report states them (English). */
	title: string;
	headline: string;
	findings: { title: string; text: string }[];
	/** The private link to the report (`/r/<token>`). */
	shareUrl: string;
	appUrl?: string;
}

/** "October 2026" / "Oktober 2026". */
const monthName = (month: string, language: ReportMailLanguage) =>
	new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${month}-01T00:00:00Z`));

const COPY = {
	en: {
		subject: (venue: string, month: string) => `${venue}: your ${month} report`,
		greeting: (name?: string | null) => (name ? `Hi ${name},` : 'Hello,'),
		ready: (venue: string, month: string) => (
			<>
				the <B>{month}</B> report for <B>{venue}</B> is ready. What stood out:
			</>
		),
		findings: 'Three findings',
		language: null,
		button: 'Open the report',
		link: 'The link opens on any phone without a login, with a PDF to download.',
		stop: 'No longer want these reports? Reply “stop” and we won’t write again.',
		reason: (venue: string) =>
			`You got this e-mail because ${venue} receives the monthly Culinary Report.`,
	},
	de: {
		subject: (venue: string, month: string) => `${venue}: Ihr Bericht für ${month}`,
		greeting: (name?: string | null) => (name ? `Hallo ${name},` : 'Guten Tag,'),
		ready: (venue: string, month: string) => (
			<>
				der Bericht für <B>{venue}</B> für <B>{month}</B> ist fertig. Das fiel auf:
			</>
		),
		findings: 'Drei Erkenntnisse',
		// The report itself is written in English
		language: 'Der Bericht selbst ist auf Englisch.',
		button: 'Bericht öffnen',
		link: 'Der Link öffnet sich auf jedem Handy ohne Anmeldung, mit PDF zum Herunterladen.',
		stop: 'Sie möchten keine Berichte mehr? Antworten Sie mit „Stopp“, dann schreiben wir Ihnen nicht mehr.',
		reason: (venue: string) =>
			`Sie erhalten diese E-Mail, weil ${venue} den monatlichen Culinary Report bekommt.`,
	},
} satisfies Record<ReportMailLanguage, unknown>;

/** The subject line of a report mail, in the recipient's language. */
export const reportReadySubject = (
	props: Pick<ReportReadyEmailProps, 'language' | 'venueName' | 'month'>,
) => COPY[props.language].subject(props.venueName, monthName(props.month, props.language));

const findingTitle: React.CSSProperties = {
	margin: '0 0 2px',
	fontFamily: font.sans,
	fontSize: 15,
	lineHeight: '22px',
	fontWeight: 600,
	color: color.ink,
};

const findingText: React.CSSProperties = {
	margin: 0,
	fontFamily: font.sans,
	fontSize: 15,
	lineHeight: '23px',
	color: color.muted,
};

// The monthly report, to a venue that subscribed: the cover, its three findings and the link.
// The recipient is a business contact with no account, so there is no preference switch:
// replying "stop" opts them out by hand.
export const ReportReadyEmail = ({
	language,
	venueName,
	month,
	contactName,
	title,
	headline,
	findings,
	shareUrl,
	appUrl = DEFAULT_APP_URL,
}: ReportReadyEmailProps) => {
	const copy = COPY[language];
	const monthLabel = monthName(month, language);
	return (
		<Layout appUrl={appUrl} lang={language} preview={headline} reason={copy.reason(venueName)}>
			<Title>{title}</Title>
			<P>{copy.greeting(contactName)}</P>
			<P>{copy.ready(venueName, monthLabel)}</P>
			<P>
				<B>{headline}</B>
			</P>
			<Block>
				<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
					<tbody>
						{findings.slice(0, 3).map((finding, index) => (
							<tr key={index}>
								<td
									style={{
										padding: '10px 0',
										borderTop:
											index > 0 ? `1px dashed ${color.dash}` : undefined,
									}}
								>
									<p style={findingTitle}>{finding.title}</p>
									<p style={findingText}>{finding.text}</p>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Block>
			{copy.language && <P muted>{copy.language}</P>}
			<Button href={shareUrl}>{copy.button}</Button>
			<Small>{copy.link}</Small>
			<Small>{copy.stop}</Small>
		</Layout>
	);
};

ReportReadyEmail.PreviewProps = {
	language: 'en',
	venueName: 'Imbiss Olympische Brücke',
	month: '2026-09',
	contactName: 'Mehmet',
	title: 'The spit decides the stars',
	headline:
		'34 Google reviews in September, 4.4 stars on average; the meat is what the 4-star reviews hold back on.',
	findings: [
		{
			title: 'The meat splits the stars',
			text: '9 of the 14 written reviews below 5 stars criticise the meat as dry; none of the 5-star ones do.',
		},
		{
			title: 'Creators found you',
			text: '6 TikTok posts by others reached 212,000 views, led by @berlinfoodguide.',
		},
		{
			title: 'Replies are missing',
			text: '11 of 34 reviews got an answer (32%); the critical ones none.',
		},
	],
	shareUrl: 'https://culinaryreport.com/r/0123456789abcdefghijkl',
} satisfies ReportReadyEmailProps;

export default ReportReadyEmail;
