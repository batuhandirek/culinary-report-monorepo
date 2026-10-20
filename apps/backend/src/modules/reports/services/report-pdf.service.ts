import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import puppeteer, { Browser } from 'puppeteer';

import { mainConfig } from 'src/config/main.config.js';

import type { AdminReportOutputDto } from '../dto/admin-report.output.dto.js';

// How long the print page may take to load its fonts and lay the report out
const RENDER_TIMEOUT_MS = 30_000;

/**
 * Prints a report to PDF in headless Chrome. The frontend's `/print/report` page draws it: it holds
 * no data of its own and renders the report handed to it on `window.__REPORT__`, so the browser needs
 * no session. One browser serves every request, a page each.
 */
@Injectable()
export class ReportPdfService implements OnModuleDestroy {
	private readonly logger = new Logger(ReportPdfService.name);
	private browser?: Promise<Browser>;

	async render(report: AdminReportOutputDto): Promise<Uint8Array> {
		const browser = await this.getBrowser();
		const page = await browser.newPage();
		try {
			await page.evaluateOnNewDocument(
				data => {
					(window as unknown as { __REPORT__: unknown }).__REPORT__ = data;
				},
				JSON.parse(JSON.stringify(report)),
			);
			await page.goto(`${mainConfig.PUBLIC_APP_URL}/print/report`, {
				waitUntil: 'networkidle0',
				timeout: RENDER_TIMEOUT_MS,
			});
			await page.waitForSelector('[data-report-ready]', { timeout: RENDER_TIMEOUT_MS });
			await page.evaluate(() => document.fonts.ready);
			return await page.pdf({ printBackground: true, preferCSSPageSize: true });
		} finally {
			await page.close();
		}
	}

	private getBrowser(): Promise<Browser> {
		this.browser ??= puppeteer
			// Puppeteer's pinned Chrome from PUPPETEER_CACHE_DIR, or PUPPETEER_EXECUTABLE_PATH when set
			// (both read by Puppeteer itself). A container's /dev/shm is 64 MB, too small for Chrome.
			.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] })
			.then(browser => {
				// A crashed browser is replaced on the next request
				browser.on('disconnected', () => {
					this.logger.warn('PDF browser disconnected');
					this.browser = undefined;
				});
				return browser;
			});
		return this.browser;
	}

	async onModuleDestroy() {
		const browser = await this.browser?.catch(() => undefined);
		await browser?.close();
	}
}
