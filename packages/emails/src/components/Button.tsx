import { Button as EmailButton } from 'react-email';
import * as React from 'react';

import { color, font } from '../theme';

interface Props {
	href: string;
	children: React.ReactNode;
}

/**
 * The app's orange stamp, and like there the one primary action of the page. The hard
 * offset is the frame itself, drawn heavier on two sides.
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
							fontWeight: 600,
							padding: '13px 24px',
							borderRadius: 10,
							borderStyle: 'solid',
							borderColor: color.ink,
							borderWidth: '2px 5px 5px 2px',
						}}
					>
						{children}
					</EmailButton>
				</td>
			</tr>
		</tbody>
	</table>
);
