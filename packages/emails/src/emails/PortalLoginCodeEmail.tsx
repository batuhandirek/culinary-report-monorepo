import * as React from 'react';

import { Code } from '../components/Code';
import { Layout } from '../components/Layout';
import { P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface PortalLoginCodeEmailProps {
	code: string;
	appUrl?: string;
}

// The code that signs a venue's people in to their portal. English: the portal's language.
export const PortalLoginCodeEmail = ({
	code,
	appUrl = DEFAULT_APP_URL,
}: PortalLoginCodeEmailProps) => (
	<Layout
		appUrl={appUrl}
		lang="en"
		preview="Type it on the sign-in page to open your portal."
		reason="You got this e-mail because someone asked to sign in to Munchwerk with this address."
	>
		<Title>Your sign-in code</Title>
		<P>Enter this code on the Munchwerk sign-in page.</P>
		<Code>{code}</Code>
		<Small>
			Don't share it with anyone; we never ask for it. If you didn't ask for a code, you can
			ignore this e-mail.
		</Small>
	</Layout>
);

PortalLoginCodeEmail.PreviewProps = { code: '123456' } satisfies PortalLoginCodeEmailProps;

export default PortalLoginCodeEmail;
