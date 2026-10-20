import * as React from 'react';

import { color, font } from '../theme';

import { Block } from './Block';

interface Props {
	/** Who wrote it, as a line above the bubble. */
	from: string;
	children: React.ReactNode;
}

/** Someone's own words (the note sent with an offer), as the bubble they'd be in a chat. */
export const Quote = ({ from, children }: Props) => (
	<Block>
		<div
			style={{
				margin: '0 0 6px',
				fontFamily: font.sans,
				fontSize: 13,
				lineHeight: '19px',
				color: color.muted,
			}}
		>
			{from}
		</div>
		<table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
			<tbody>
				<tr>
					<td
						style={{
							backgroundColor: color.sand,
							border: `1px solid ${color.line}`,
							borderRadius: '2px 12px 12px 12px',
							padding: '10px 14px',
							fontFamily: font.sans,
							fontSize: 15,
							lineHeight: '23px',
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
