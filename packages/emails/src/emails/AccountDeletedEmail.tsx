import * as React from 'react';

import { Layout } from '../components/Layout';
import { P, Title } from '../components/Typography';
import { DEFAULT_APP_URL } from '../format';

interface AccountDeletedEmailProps {
	user: {
		firstName: string;
	};
	appUrl?: string;
}

// The last mail an account gets: the deletion they asked for is done.
export const AccountDeletedEmail = ({
	user,
	appUrl = DEFAULT_APP_URL,
}: AccountDeletedEmailProps) => (
	<Layout
		appUrl={appUrl}
		preview="İstediğin gibi hesabın ve ona bağlı her şey silindi."
		reason="Bu e-postayı, Culinary Report hesabını silmemizi istediğin için aldın. Bu adrese başka e-posta göndermeyeceğiz."
	>
		<Title>Hesabın silindi</Title>
		<P>
			Merhaba {user.firstName}, istediğin gibi Culinary Report hesabını ve ona bağlı
			verileri kalıcı olarak sildik.
		</P>
		<P>Bir gün geri dönmek istersen yeni bir hesap açabilirsin.</P>
	</Layout>
);

AccountDeletedEmail.PreviewProps = {
	user: { firstName: 'Batuhan' },
} satisfies AccountDeletedEmailProps;

export default AccountDeletedEmail;
