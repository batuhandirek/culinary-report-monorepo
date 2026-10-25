import * as React from 'react';

import { Code } from '../components/Code';
import { Layout } from '../components/Layout';
import { P, Small, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface ForgotPasswordEmailProps {
	code: string;
	appUrl?: string;
}

export const ForgotPasswordEmail = ({
	code,
	appUrl = DEFAULT_APP_URL,
}: ForgotPasswordEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview="Şifreni yenilemek için kodun hazır."
		reason="Bu e-postayı, Munchwerk hesabın için şifre sıfırlama istendiği için aldın."
	>
		<Title>Şifreni sıfırla</Title>
		<P>Yeni bir şifre belirlemek için aşağıdaki kodu gir.</P>
		<Code>{code}</Code>
		<Small>
			Kodu kimseyle paylaşma; biz de senden istemeyiz. Şifre sıfırlamayı sen istemediysen bir
			şey yapmana gerek yok, şifren değişmedi.
		</Small>
	</Layout>
);

ForgotPasswordEmail.PreviewProps = { code: '123456' } satisfies ForgotPasswordEmailProps;

export default ForgotPasswordEmail;
