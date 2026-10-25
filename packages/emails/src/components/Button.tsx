import { Button as EmailButton } from 'react-email';
import * as React from 'react';

import { color, font } from '../theme';

interface Props {
	href: string;
	children: React.ReactNode;
}

/**
 * The brand's acid stamp, and like in the app the one primary action of the page: acid
 * fill, ink text, an ink frame. The hard offset is the frame itself, drawn heavier on two
 * sides, since Gmail drops `box-shadow`.
 */
export const Button = ({ href, children }: Props) => (
	<table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
		<tbody>
			<tr>
				<td style={{ padding: '6px 0 18px' }}>
					<EmailButton
						href={href}
						style={{
							backgroundColor: color.primary,
							color: color.ink,
							fontFamily: font.sans,
							fontSize: 16,
							fontWeight: 700,
							padding: '13px 24px',
							borderRadius: 6,
							borderStyle: 'solid',
							borderColor: color.ink,
							borderWidth: '2px 6px 6px 2px',
						}}
					>
						{children}
					</EmailButton>
				</td>
			</tr>
		</tbody>
	</table>
);
