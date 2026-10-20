import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Note } from '../components/Note';
import { B, P, Title } from '../components/Typography';
import { DEFAULT_APP_URL, formatDeadline } from '../format';

interface PasswordChangedEmailProps {
	changedAt: Date;
	appUrl?: string;
}

// A security notice: the account owner hears of a password change they may not have made.
export const PasswordChangedEmail = ({
	changedAt,
	appUrl = DEFAULT_APP_URL,
}: PasswordChangedEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview="Bunu sen yaptıysan bir şey yapmana gerek yok."
		reason="Bu e-postayı Culinary Report hesabının güvenliği için aldın."
	>
		<Title>Şifren değişti</Title>
		<P>
			Culinary Report hesabının şifresi <B>{formatDeadline(changedAt)}</B> saatinde değiştirildi.
			Bunu sen yaptıysan bir şey yapmana gerek yok.
		</P>
		<Note>
			<B>Sen yapmadıysan</B> hesabına başkası girmiş olabilir: şifreni hemen sıfırla ve bize
			yaz.
		</Note>
		<Button href={`${appUrl}/auth/forgot-password`}>Şifremi sıfırla</Button>
	</Layout>
);

PasswordChangedEmail.PreviewProps = {
	changedAt: new Date('2026-10-06T11:30:00Z'),
} satisfies PasswordChangedEmailProps;

export default PasswordChangedEmail;
