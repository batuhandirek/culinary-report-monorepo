import { Body, Container, Head, Html, Preview } from 'react-email';
import * as React from 'react';

import { DEFAULT_APP_URL } from '../format';
import { cls, color, font, responsiveCss, webFontCss } from '../theme';

import { Footer, type MailLanguage } from './Footer';
import { Logo } from './Logo';

interface Props {
	/** The line an inbox shows beside the subject, so it should add to it, not repeat it. */
	preview: string;
	/** Why the reader got this mail, as the footer's first sentence. */
	reason?: string;
	/** Where links point: the environment's own site. */
	appUrl?: string;
	/** The mail's language, for `<html lang>` and the footer. */
	lang?: MailLanguage;
	children: React.ReactNode;
}

/**
 * Every mail is one paper sheet on the sand ground, wordmark above it and the small print
 * below. Layout is tables and inline styles throughout: that is what mail clients draw.
 */
export const Layout = ({
	preview,
	reason,
	appUrl = DEFAULT_APP_URL,
	lang = 'tr',
	children,
}: Props) => (
	<Html lang={lang}>
		<Head>
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>{preview}</title>
			{/* The palette is the brand's, not a light theme: ask clients not to invert it. */}
			<meta name="color-scheme" content="light only" />
			<meta name="supported-color-schemes" content="light only" />
			<style dangerouslySetInnerHTML={{ __html: webFontCss + responsiveCss }} />
		</Head>
		<Preview>{preview}</Preview>
		<Body
			style={{
				margin: 0,
				padding: '32px 12px 40px',
				backgroundColor: color.sand,
				color: color.ink,
				fontFamily: font.sans,
			}}
		>
			<Container style={{ maxWidth: 560 }}>
				<Logo appUrl={appUrl} />
				<table
					role="presentation"
					width="100%"
					cellPadding={0}
					cellSpacing={0}
					border={0}
					style={{
						backgroundColor: color.paper,
						// A hairline all round, heavier on two sides: the app's hard offset
						// (`shadow-sticker`) without `box-shadow`, which Gmail drops.
						borderStyle: 'solid',
						borderColor: color.line,
						borderWidth: '1px 4px 4px 1px',
						borderRadius: 12,
						borderCollapse: 'separate',
					}}
				>
					<tbody>
						<tr>
							<td className={cls.sheet} style={{ padding: '34px 36px 20px' }}>
								{children}
							</td>
						</tr>
					</tbody>
				</table>
				<Footer appUrl={appUrl} reason={reason} lang={lang} />
			</Container>
		</Body>
	</Html>
);
