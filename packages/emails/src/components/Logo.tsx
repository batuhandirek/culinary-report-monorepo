import { Img, Link } from 'react-email';
import * as React from 'react';

import { color, font } from '../theme';

// The orange badge with the letters knocked out: on sand it stands as it is.
export const Logo = ({ appUrl }: { appUrl: string }) => (
	<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
		<tbody>
			<tr>
				<td style={{ padding: '0 4px 18px' }}>
					{/* An image link has no words: the plain-text body leaves it out. */}
					<Link href={appUrl} data-skip-in-text="true" style={{ textDecoration: 'none' }}>
						<Img
							src="https://culinaryreport.com/logo.png"
							width={118}
							height={33}
							alt="Culinary Report"
							// What shows while images are blocked.
							style={{
								fontFamily: font.sans,
								fontSize: 20,
								fontWeight: 700,
								color: color.ink,
							}}
						/>
					</Link>
				</td>
			</tr>
		</tbody>
	</table>
);
