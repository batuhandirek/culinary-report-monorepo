import { Img, Link } from 'react-email';
import * as React from 'react';

import { color, font } from '../theme';

// The drawn wordmark as a PNG (`static/brand/email-logo.png`, rendered by
// `bin/build-brand-assets.mjs` at 2×): mail clients don't draw SVG. With images blocked, the alt
// text stands in, set heavy in ink.
export const Logo = ({ appUrl }: { appUrl: string }) => (
	<table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
		<tbody>
			<tr>
				<td style={{ padding: '0 4px 20px' }}>
					<Link
						href={appUrl}
						// A wordmark link has no news in it: the plain-text body leaves it out.
						data-skip-in-text="true"
						style={{ textDecoration: 'none', display: 'inline-block' }}
					>
						<Img
							src={`${appUrl}/brand/email-logo.png`}
							width={160}
							height={19}
							alt="Munchwerk"
							style={{
								display: 'block',
								border: 0,
								color: color.ink,
								fontFamily: font.display,
								fontSize: 20,
								fontWeight: 800,
								lineHeight: '19px',
							}}
						/>
					</Link>
				</td>
			</tr>
		</tbody>
	</table>
);
