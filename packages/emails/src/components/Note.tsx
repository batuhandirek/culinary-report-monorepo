import * as React from 'react';

import { color, font } from '../theme';

import { Block } from './Block';

interface Props {
	children: React.ReactNode;
}

/** The app's ink strip: the one thing with a clock on it, usually a deadline. */
export const Note = ({ children }: Props) => (
	<Block>
		<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
			<tbody>
				<tr>
					<td
						style={{
							backgroundColor: color.tint,
							borderRadius: 6,
							padding: '11px 14px',
							fontFamily: font.sans,
							fontSize: 14,
							lineHeight: '21px',
							color: color.ink,
						}}
					>
						{children}
					</td>
				</tr>
			</tbody>
		</table>
	</Block>
);
