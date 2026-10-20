import { Global, Module } from '@nestjs/common';

import { SitemapController } from './controllers/sitemap.controller.js';
import { SitemapService } from './services/sitemap.service.js';

// Global so any module with public pages can inject the service and register a section
@Global()
@Module({
	controllers: [SitemapController],
	providers: [SitemapService],
	exports: [SitemapService],
})
export class SitemapModule {}
