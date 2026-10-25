import * as React from 'react';

import { cls, color, font } from '../theme';

import { Block } from './Block';

export interface Fact {
	label: React.ReactNode;
	value: React.ReactNode;
	/** The sum the rows above add up to: ruled off in ink. */
	total?: boolean;
}

const cell: React.CSSProperties = {
	padding: '9px 0',
	fontFamily: font.sans,
	fontSize: 14,
	lineHeight: '20px',
	verticalAlign: 'top',
};

/** What a slip lists: label on the left, figure on the right, a dashed rule between rows. */
export const Facts = ({ rows }: { rows: Fact[] }) => (
	<Block>
		<table
			className={cls.facts}
			role="presentation"
			width="100%"
			cellPadding={0}
			cellSpacing={0}
			border={0}
		>
			<tbody>
				{rows.map((row, index) => {
					const borderTop =
						row.total ? `3px solid ${color.ink}`
						: index > 0 ? `1px dashed ${color.dash}`
						: undefined;
					// Labels may repeat (two buyers of one name): a row is keyed by its place.
					return (
						<tr key={index}>
							<td
								style={{
									...cell,
									borderTop,
									paddingRight: 16,
									color: row.total ? color.ink : color.muted,
									fontWeight: row.total ? 700 : 400,
								}}
							>
								{row.label}
							</td>
							<td
								align="right"
								style={{
									...cell,
									borderTop,
									color: color.ink,
									fontWeight: row.total ? 700 : 600,
								}}
							>
								{row.value}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	</Block>
);
