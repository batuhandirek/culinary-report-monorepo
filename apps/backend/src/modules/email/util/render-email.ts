import { plainTextOptions } from 'emails';
import { render, toPlainText } from 'react-email';

import { mainConfig } from 'src/config/main.config.js';

/**
 * A template from the `emails` package as the two bodies of a mail. Its links point at
 * this environment's own site, so a dev mail never sends anyone to production.
 */
export async function renderEmail<P extends object>(
	template: (props: P & { appUrl?: string }) => React.JSX.Element,
	props: P,
): Promise<{ html: string; text: string }> {
	const html = await render(template({ ...props, appUrl: mainConfig.PUBLIC_APP_URL }));
	return { html, text: toPlainText(html, plainTextOptions) };
}
