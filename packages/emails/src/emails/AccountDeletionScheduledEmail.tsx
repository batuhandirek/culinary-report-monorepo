import * as React from 'react';

import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { Note } from '../components/Note';
import { B, P, Title } from '../components/Typography';
import { DEFAULT_APP_URL, formatDay } from '../format';

interface AccountDeletionScheduledEmailProps {
	user: {
		firstName: string;
	};
	/** The day the account is deleted for good. */
	deletionDate: Date;
	appUrl?: string;
}

export const AccountDeletionScheduledEmail = ({
	user,
	deletionDate,
	appUrl = DEFAULT_APP_URL,
}: AccountDeletionScheduledEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview={`Hesabın ${formatDay(deletionDate)} tarihinde silinecek. O güne kadar vazgeçebilirsin.`}
		reason="Bu e-postayı, Munchwerk hesabını silmemizi istediğin için aldın."
	>
		<Title>Hesap silme isteğini aldık</Title>
		<P>
			Merhaba {user.firstName}, hesabın <B>{formatDay(deletionDate)}</B> tarihinde kalıcı
			olarak silinecek. Hesabına bağlı veriler de onunla birlikte silinir.
		</P>
		<Note>Fikrini değiştirirsen o güne kadar vazgeçebilirsin. Sonrasında geri alınamaz.</Note>
		<Button href={`${appUrl}/profil/guvenlik`}>Silme isteğini iptal et</Button>
	</Layout>
);

AccountDeletionScheduledEmail.PreviewProps = {
	user: { firstName: 'Batuhan' },
	deletionDate: new Date('2026-10-14T09:00:00Z'),
} satisfies AccountDeletionScheduledEmailProps;

export default AccountDeletionScheduledEmail;
