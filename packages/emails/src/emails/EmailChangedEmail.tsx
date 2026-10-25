import * as React from 'react';

import { Layout } from '../components/Layout';
import { Note } from '../components/Note';
import { B, P, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface EmailChangedEmailProps {
	/** The address the account moved to, masked: this mail goes to the old one. */
	newEmail: string;
	appUrl?: string;
}

// A security notice to the address an account just left.
export const EmailChangedEmail = ({
	newEmail,
	appUrl = DEFAULT_APP_URL,
}: EmailChangedEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview="Bunu sen yaptıysan bir şey yapmana gerek yok."
		reason="Bu e-postayı Munchwerk hesabının güvenliği için aldın."
	>
		<Title>E-posta adresin değişti</Title>
		<P>
			Munchwerk hesabının e-posta adresi <B>{newEmail}</B> olarak değiştirildi. Bundan sonra
			bu adrese e-posta göndermeyeceğiz.
		</P>
		<P>Bunu sen yaptıysan bir şey yapmana gerek yok.</P>
		<Note>
			<B>Sen yapmadıysan</B> hesabına başkası girmiş olabilir: hemen support@munchwerk.com
			adresine yaz.
		</Note>
	</Layout>
);

EmailChangedEmail.PreviewProps = {
	newEmail: 'b•••@gmail.com',
} satisfies EmailChangedEmailProps;

export default EmailChangedEmail;
