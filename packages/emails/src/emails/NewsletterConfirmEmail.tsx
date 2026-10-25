import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface NewsletterConfirmEmailProps {
	/** The city edition signed up for: "Berlin" */
	cityName: string;
	/** The page that confirms the address (`/newsletter/confirm?token=…`). */
	confirmUrl: string;
	appUrl?: string;
}

/** The subject line of the confirmation mail. */
export const newsletterConfirmSubject = (cityName: string) => `Confirm your Munchwerk ${cityName} e-mail`;

// Someone typed this address into the front page's newsletter form: the double opt-in.
export const NewsletterConfirmEmail = ({ cityName, confirmUrl, appUrl = DEFAULT_APP_URL }: NewsletterConfirmEmailProps) => (
	<Layout
		appUrl={appUrl}
		lang="en"
		preview="One tap and the Heat Check lands in your inbox on the 1st."
		reason="You got this e-mail because this address was entered on munchwerk.com to get the monthly e-mail.">
		<Title>One tap and you're in</Title>
		<P>
			Confirm this address and Munchwerk {cityName} lands in your inbox once a month: the 10 places the city
			talked about most, the dishes it couldn't put down and what just opened. No ads, ever.
		</P>
		<Button href={confirmUrl}>Yes, send it monthly</Button>
		<Small>
			If you didn't ask for this, ignore this e-mail: without a tap on the button we never write to you again.
		</Small>
	</Layout>
);

NewsletterConfirmEmail.PreviewProps = {
	cityName: 'Berlin',
	confirmUrl: 'https://munchwerk.com/newsletter/confirm?token=abc',
} satisfies NewsletterConfirmEmailProps;

export default NewsletterConfirmEmail;
