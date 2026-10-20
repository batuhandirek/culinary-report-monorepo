import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { B, P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

export type PortalInviteLanguage = 'en' | 'de';

interface PortalInviteEmailProps {
	venueName: string;
	/** The portal's sign-in page with the address filled in. */
	loginUrl: string;
	lang?: PortalInviteLanguage;
	appUrl?: string;
}

const COPY = {
	en: {
		subject: (venue: string) => `Your Culinary Report portal for ${venue}`,
		preview: 'Your monthly reports and charts, in one place.',
		reason: 'You got this e-mail because Culinary Report invited this address to a venue portal.',
		title: 'Your portal is ready',
		body: (venue: React.ReactNode) => (
			<>
				We set up a private portal for {venue}: every monthly report, the PDFs and how the
				numbers move month to month.
			</>
		),
		howTo:
			'There is no password. Open the link, and we send a six-digit code to this address to sign you in.',
		button: 'Open the portal',
		ignore: "If you didn't expect this, you can ignore this e-mail.",
	},
	de: {
		subject: (venue: string) => `Ihr Culinary-Report-Portal für ${venue}`,
		preview: 'Ihre monatlichen Berichte und Diagramme an einem Ort.',
		reason:
			'Sie erhalten diese E-Mail, weil Culinary Report diese Adresse zu einem Portal eingeladen hat.',
		title: 'Ihr Portal ist bereit',
		body: (venue: React.ReactNode) => (
			<>
				Wir haben für {venue} ein privates Portal eingerichtet: alle Monatsberichte, die PDFs
				und wie sich die Zahlen von Monat zu Monat entwickeln. Die Berichte sind auf Englisch.
			</>
		),
		howTo:
			'Ein Passwort gibt es nicht. Öffnen Sie den Link, und wir schicken einen sechsstelligen Code an diese Adresse.',
		button: 'Portal öffnen',
		ignore: 'Wenn Sie das nicht erwartet haben, können Sie diese E-Mail ignorieren.',
	},
} as const;

/** The subject line of the invite, in the same language as its body. */
export const portalInviteSubject = (venueName: string, lang: PortalInviteLanguage = 'en') =>
	COPY[lang].subject(venueName);

// An admin invited this address to a venue's portal.
export const PortalInviteEmail = ({
	venueName,
	loginUrl,
	lang = 'en',
	appUrl = DEFAULT_APP_URL,
}: PortalInviteEmailProps) => {
	const copy = COPY[lang];
	return (
		<Layout appUrl={appUrl} lang={lang} preview={copy.preview} reason={copy.reason}>
			<Title>{copy.title}</Title>
			<P>{copy.body(<B>{venueName}</B>)}</P>
			<P>{copy.howTo}</P>
			<Button href={loginUrl}>{copy.button}</Button>
			<Small>{copy.ignore}</Small>
		</Layout>
	);
};

PortalInviteEmail.PreviewProps = {
	venueName: 'Café Kranzler',
	loginUrl: 'https://culinaryreport.com/portal/login?email=owner%40example.com',
} satisfies PortalInviteEmailProps;

export default PortalInviteEmail;
