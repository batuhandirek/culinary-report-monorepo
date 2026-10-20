import * as React from 'react';

interface Props {
	children: React.ReactNode;
}

/**
 * A full-width piece of the sheet's flow (a card, a table, a strip). Its spacing is cell
 * padding: margins on tables don't survive every client.
 */
export const Block = ({ children }: Props) => (
	<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
		<tbody>
			<tr>
				<td style={{ padding: '6px 0 20px' }}>{children}</td>
			</tr>
		</tbody>
	</table>
);
