import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { P, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface AccountDeletionReminderEmailProps {
	user: {
		firstName: string;
	};
	appUrl?: string;
}

export const AccountDeletionReminderEmail = ({
	user,
	appUrl = DEFAULT_APP_URL,
}: AccountDeletionReminderEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview="Fikrini değiştirdiysen bugün vazgeçebilirsin."
		reason="Bu e-postayı, Culinary Report hesabını silmemizi istediğin için aldın."
	>
		<Title>Hesabın yarın siliniyor</Title>
		<P>
			Merhaba {user.firstName}, istediğin hesap silme işlemi yarın gerçekleşecek. Hesabına
			bağlı veriler kalıcı olarak silinir; bu geri alınamaz.
		</P>
		<P>Fikrini değiştirdiysen bugün vazgeçebilirsin.</P>
		<Button href={`${appUrl}/profil/guvenlik`}>Silme isteğini iptal et</Button>
	</Layout>
);

AccountDeletionReminderEmail.PreviewProps = {
	user: { firstName: 'Batuhan' },
} satisfies AccountDeletionReminderEmailProps;

export default AccountDeletionReminderEmail;
