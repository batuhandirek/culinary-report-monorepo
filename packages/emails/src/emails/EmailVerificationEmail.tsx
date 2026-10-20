import * as React from 'react';

import { Code } from '../components/Code';
import { Layout } from '../components/Layout';
import { P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface EmailVerificationProps {
	code: string;
	appUrl?: string;
}

export const EmailVerificationEmail = ({
	code,
	appUrl = DEFAULT_APP_URL,
}: EmailVerificationProps) => (
	<Layout
		appUrl={appUrl}
		preview="E-posta adresini doğrulamak için kodun hazır."
		reason="Bu e-postayı, bu adres Culinary Report'ta doğrulanmak istendiği için aldın."
	>
		<Title>E-posta adresini doğrula</Title>
		<P>Culinary Report'ta bu adresi doğrulamak için aşağıdaki kodu gir.</P>
		<Code>{code}</Code>
		<Small>
			Kodu kimseyle paylaşma; biz de senden istemeyiz. Bu kodu sen istemediysen e-postayı yok
			sayabilirsin.
		</Small>
	</Layout>
);

EmailVerificationEmail.PreviewProps = { code: '123456' } satisfies EmailVerificationProps;

export default EmailVerificationEmail;
