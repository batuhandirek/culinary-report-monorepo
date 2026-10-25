import { Link } from 'react-email';
import * as React from 'react';

import { color, font } from '../theme';

const line: React.CSSProperties = {
	margin: '0 0 6px',
	fontFamily: font.sans,
	fontSize: 13,
	lineHeight: '20px',
	color: color.muted,
};

const link: React.CSSProperties = { color: color.muted, textDecoration: 'underline' };

export type MailLanguage = 'tr' | 'en' | 'de';

// The footer's own words per language: a mail to a venue is in the prospect's language.
const COPY: Record<MailLanguage, { reason: string; help: [string, string]; tagline: string }> = {
	tr: {
		reason: 'Bu e-postayı Munchwerk hesabınla ilgili olduğu için aldın.',
		help: ['Bir sorun mu var?', 'adresine yaz.'],
		tagline: ': mekânın hakkında sosyal medyanın her ay söyledikleri',
	},
	en: {
		reason: 'You got this e-mail from Munchwerk.',
		help: ['A question? Write to', ''],
		tagline: ': what social media says about your venue, every month',
	},
	de: {
		reason: 'Diese E-Mail kommt von Munchwerk.',
		help: ['Eine Frage? Schreiben Sie an', ''],
		tagline: ': was Social Media jeden Monat über Ihr Lokal sagt',
	},
};

interface Props {
	appUrl: string;
	reason?: string;
	lang?: MailLanguage;
}

// The small print, on the oat under the sheet: why this mail came, and who to write to.
export const Footer = ({ appUrl, lang = 'tr', reason = COPY[lang].reason }: Props) => (
	<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
		<tbody>
			<tr>
				<td style={{ padding: '22px 4px 0' }}>
					<p style={line}>{reason}</p>
					<p style={line}>
						{COPY[lang].help[0]}{' '}
						<Link href="mailto:support@munchwerk.com" style={link}>
							support@munchwerk.com
						</Link>
						{COPY[lang].help[1] ? ` ${COPY[lang].help[1]}` : '.'}
					</p>
					<p style={{ ...line, margin: 0, color: color.faint }}>
						<Link href={appUrl} style={{ ...link, color: color.faint }}>
							Munchwerk
						</Link>
						{COPY[lang].tagline}
					</p>
				</td>
			</tr>
		</tbody>
	</table>
);
