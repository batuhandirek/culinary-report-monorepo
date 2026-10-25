import { Link } from 'react-email';
import * as React from 'react';

import { cls, color, font } from '../theme';

interface Props {
	children: React.ReactNode;
}

/** The one heading of a mail: what happened, as a sentence, in the display face. */
export const Title = ({ children }: Props) => (
	<h1
		className={cls.display}
		style={{
			margin: '0 0 12px',
			fontFamily: font.display,
			fontSize: 28,
			lineHeight: '32px',
			fontWeight: 800,
			letterSpacing: '-0.02em',
			color: color.ink,
		}}
	>
		{children}
	</h1>
);

export const P = ({ children, muted }: Props & { muted?: boolean }) => (
	<p
		style={{
			margin: '0 0 14px',
			fontFamily: font.sans,
			fontSize: 16,
			lineHeight: '25px',
			color: muted ? color.muted : color.ink,
		}}
	>
		{children}
	</p>
);

/** A closing aside under the button: what else the reader may want to know. */
export const Small = ({ children }: Props) => (
	<p
		style={{
			margin: '0 0 14px',
			fontFamily: font.sans,
			fontSize: 14,
			lineHeight: '21px',
			color: color.muted,
		}}
	>
		{children}
	</p>
);

/** A name, an amount or a date inside a sentence. */
export const B = ({ children }: Props) => <strong style={{ fontWeight: 600 }}>{children}</strong>;

export const TextLink = ({ href, children }: Props & { href: string }) => (
	<Link href={href} style={{ color: color.grape, textDecoration: 'underline' }}>
		{children}
	</Link>
);
