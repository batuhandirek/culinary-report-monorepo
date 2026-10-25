import * as React from 'react';

import { cls, color, font } from '../theme';

import { Block } from './Block';

/** A one-time code: wide-set digits to read off one screen and type into another. */
export const Code = ({ children }: { children: string }) => (
	<Block>
		<table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
			<tbody>
				<tr>
					<td
						className={cls.mono}
						style={{
							backgroundColor: color.sand,
							border: `2px solid ${color.ink}`,
							borderRadius: 6,
							// Letter-spacing trails the last digit: less padding on that side evens it.
							padding: '14px 14px 14px 24px',
							fontFamily: font.mono,
							fontSize: 34,
							lineHeight: '40px',
							fontWeight: 700,
							letterSpacing: '10px',
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
