import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { testCity } from 'src/modules/cities/tests/factories/city.factory.js';
import { Mention, MentionMatchMethodEnum } from 'src/modules/social/entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';
import { brandFactory } from 'src/modules/venues/tests/factories/brand.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { mockAgent } from 'src/tests/mock-agent.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { ReportHighlightsAgent } from '../agents/report-highlights.agent.js';
import { ReviewReplyAgent } from '../agents/review-reply.agent.js';
import {
	ReportConfigStatusEnum,
	ReportCoverKpiEnum,
	ReportSectionKindEnum as Kind,
} from '../constants/report-section.constant.js';
import { BrandReportConfig } from '../entities/brand-report-config.entity.js';
import { Report } from '../entities/report.entity.js';
import {
	CoverReportSection,
	CreatorsReportSection,
	PostsReportSection,
} from '../entities/report-section.embeddable.js';
import { ReportTemplate } from '../entities/report-template.entity.js';
import { ReportService } from '../services/report.service.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { FULL_REPORT_NAME, ReportTemplateService } from '../services/report-template.service.js';
import { FULL_REPORT_SECTIONS, sectionsOutput } from '../util/report-sections.js';

import { reportTemplateFactory } from './factories/report-template.factory.js';

const HIGHLIGHTS = { title: 'A month', headline: 'It went.', highlights: [], actions: [] };

describe('report templates and brand configurations (pglite)', () => {
	let harness: PgliteTestingModule;
	let templates: ReportTemplateService;
	let configs: ReportConfigService;
	let reports: ReportService;
	const highlightsAgent = mockAgent(HIGHLIGHTS);
	const replyAgent = mockAgent({ replies: [] });

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				ReportService,
				ReportTemplateService,
				ReportConfigService,
				CompetitorService,
				BrandService,
				CityService,
				{ provide: ReportHighlightsAgent, useValue: highlightsAgent },
				{ provide: ReviewReplyAgent, useValue: replyAgent },
			],
		});
		templates = harness.moduleRef.get(ReportTemplateService);
		configs = harness.moduleRef.get(ReportConfigService);
		reports = harness.moduleRef.get(ReportService);
		entityManagerManager.setEntityManager(harness.orm.em);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		const em = harness.orm.em;
		await em.nativeDelete(Report, {});
		await em.nativeDelete(BrandReportConfig, {});
		await em.nativeDelete(ReportTemplate, {});
		em.clear();
		highlightsAgent.generate.mockClear();
		replyAgent.generate.mockClear();
	});

	const brandIn = async (name: string) => {
		const city = testCity(harness.orm.em);
		const venue = await venueFactory.create({ name }, { associations: { city } });
		return { city, brandId: venue.brand.id };
	};

	describe('templates', () => {
		it('stores each section as its own class with its settings, and reads them back so', async () => {
			const created = await templates.create({
				name: 'Social buzz',
				sections: [
					{
						kind: Kind.COVER,
						kpis: [ReportCoverKpiEnum.VIEWS, ReportCoverKpiEnum.CREATORS],
					},
					{
						kind: Kind.POSTS,
						platforms: [SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.BLOG],
						limit: 12,
					},
					{ kind: Kind.CREATORS, nearby: false },
					{ kind: Kind.APPENDIX },
				],
			});
			harness.orm.em.clear();

			const template = await templates.get(created.id);
			expect(template.sections.map(s => s.constructor)).toEqual([
				CoverReportSection,
				PostsReportSection,
				CreatorsReportSection,
				expect.any(Function),
			]);
			expect(sectionsOutput(template.sections)).toEqual([
				{ kind: 'cover', kpis: ['views', 'creators'] },
				{ kind: 'posts', platforms: ['instagram', 'blog'], limit: 12 },
				{ kind: 'creators', nearby: false },
				{ kind: 'appendix' },
			]);
		});

		it('makes the first the default, starts one without sections from the full layout, keeps one default', async () => {
			const full = await templates.create({ name: 'Full' });
			const reviews = await templates.create({ name: 'Reviews' });
			expect(full.isDefault).toBe(true);
			expect(reviews.isDefault).toBe(false);
			expect(sectionsOutput(full.sections)).toEqual(sectionsOutput(FULL_REPORT_SECTIONS()));

			await templates.setDefault(reviews.id);
			harness.orm.em.clear();
			expect((await templates.get(full.id)).isDefault).toBe(false);
			expect((await templates.get(reviews.id)).isDefault).toBe(true);
		});

		it('refuses a name taken (409) or empty (400), and deleting the default (400)', async () => {
			const full = await templates.create({ name: 'Full' });
			await expect(templates.create({ name: ' Full ' })).rejects.toThrow(ConflictException);
			await expect(templates.create({ name: '  ' })).rejects.toThrow(BadRequestException);
			await expect(templates.remove(full.id)).rejects.toThrow(BadRequestException);
		});
	});

	describe('brand configurations', () => {
		it("copies a template's sections, which edits on either side never share", async () => {
			const { brandId } = await brandIn('Pho Hanoi');
			const template = await templates.create({
				name: 'Reviews',
				sections: [{ kind: Kind.COVER }, { kind: Kind.REVIEWS }],
			});
			const config = await configs.create(brandId, { templateId: template.id });
			expect(config.name).toBe('Reviews');
			expect(config.template?.id).toBe(template.id);
			expect(config.status).toBe(ReportConfigStatusEnum.ACTIVE);

			await templates.update(template.id, {
				sections: [{ kind: Kind.COVER }, { kind: Kind.PRESS }],
			});
			await configs.update(config.id, {
				name: 'Reviews only',
				sections: [{ kind: Kind.COVER }, { kind: Kind.REVIEWS }, { kind: Kind.REPLIES }],
			});
			harness.orm.em.clear();
			expect((await templates.get(template.id)).sections.map(s => s.kind)).toEqual([
				'cover',
				'press',
			]);
			const stored = await configs.get(config.id);
			expect(stored.name).toBe('Reviews only');
			expect(stored.sections.map(s => s.kind)).toEqual(['cover', 'reviews', 'replies']);

			// A template counts the brands with a copy
			expect((await templates.list()).find(t => t.template.id === template.id)?.brands).toBe(
				1,
			);
		});

		it('updates one loaded fresh from the database (each request has its own entity manager)', async () => {
			const { city, brandId } = await brandIn('Fresh Load');
			const created = await configs.create(brandId, {});
			harness.orm.em.clear();
			await configs.update(created.id, { name: 'Renamed' });
			harness.orm.em.clear();
			await configs.update(created.id, {
				status: ReportConfigStatusEnum.INACTIVE,
				sections: [{ kind: Kind.COVER }, { kind: Kind.CITY }],
			});
			harness.orm.em.clear();
			const stored = await configs.get(created.id);
			expect(stored.name).toBe('Renamed');
			expect(stored.status).toBe(ReportConfigStatusEnum.INACTIVE);
			expect(stored.sections.map(s => s.kind)).toEqual(['cover', 'city']);

			const template = await templates.create({ name: 'Fresh' });
			harness.orm.em.clear();
			await templates.update(template.id, {
				name: 'Fresh 2',
				sections: [{ kind: Kind.COVER }],
			});
			harness.orm.em.clear();
			expect((await templates.get(template.id)).sections.map(s => s.kind)).toEqual(['cover']);

			// A copy loads its template along: the template's sections must come back whole, or the
			// next flush writes them as null (MikroORM hydrates a joined polymorphic embedded array as null)
			const copy = await configs.create(brandId, { templateId: template.id });
			harness.orm.em.clear();
			const loaded = await configs.get(copy.id);
			expect(loaded.template?.sections.map(s => s.kind)).toEqual(['cover']);
			await configs.update(copy.id, { name: 'Copy renamed' });
			harness.orm.em.clear();
			expect((await templates.get(template.id)).sections.map(s => s.kind)).toEqual(['cover']);
			// And through a build and a report that points at both
			harness.orm.em.clear();
			await reports.build(brandId, city.id, '2026-09');
			harness.orm.em.clear();
			const report = await harness.orm.em.findOneOrFail(
				Report,
				{ config: copy.id },
				{ populate: ['config', 'template'] },
			);
			expect(report.template?.sections.map(s => s.kind)).toEqual(['cover']);
			expect(report.config?.sections.map(s => s.kind)).toEqual(['cover']);
		});

		it('makes a custom one from the full layout, numbers a second copy and refuses a taken name', async () => {
			const { brandId } = await brandIn('Bun Bo');
			const custom = await configs.create(brandId, {});
			expect(custom.name).toBe('Custom report');
			expect(custom.template).toBeNull();
			expect(sectionsOutput(custom.sections)).toEqual(sectionsOutput(FULL_REPORT_SECTIONS()));

			const template = await templates.create({ name: 'Social' });
			await configs.create(brandId, { templateId: template.id });
			expect((await configs.create(brandId, { templateId: template.id })).name).toBe(
				'Social 2',
			);
			await expect(configs.create(brandId, { name: 'social' })).resolves.toBeDefined();
			await expect(configs.create(brandId, { name: 'Social' })).rejects.toThrow(
				ConflictException,
			);
		});

		it('builds a report per active configuration, the data and reply drafts once, each with its own highlights', async () => {
			const em = harness.orm.em;
			const { city, brandId } = await brandIn('Ramen Ya');
			const template = await reportTemplateFactory.create({ name: 'Full', isDefault: true });
			const full = await configs.create(brandId, { templateId: template.id });
			const reviews = await configs.create(brandId, { name: 'Reviews' });
			await configs.update(reviews.id, {
				sections: [{ kind: Kind.COVER }, { kind: Kind.REVIEWS }],
			});
			const paused = await configs.create(brandId, { name: 'Paused' });
			await configs.update(paused.id, { status: ReportConfigStatusEnum.INACTIVE });

			const built = await reports.buildAll(brandId, city.id, '2026-09');
			expect(built.map(r => r.name)).toEqual(['Full', 'Reviews']);
			expect(built.map(r => r.config?.id)).toEqual([full.id, reviews.id]);
			// The template behind each: the copy's, none for a custom one
			expect(built.map(r => r.template?.id ?? null)).toEqual([template.id, null]);
			expect(built[1].sections.map(s => s.kind)).toEqual(['cover', 'reviews']);
			expect(highlightsAgent.generate).toHaveBeenCalledTimes(2);
			expect(replyAgent.generate.mock.calls.length).toBeLessThanOrEqual(1);

			// A rebuild replaces the rows; one configuration rebuilds alone, paused or not
			await reports.buildAll(brandId, city.id, '2026-09');
			await reports.buildAll(brandId, city.id, '2026-09', { configId: paused.id });
			em.clear();
			expect(
				(await em.find(Report, { brand: brandId }, { orderBy: { name: 'asc' } })).map(
					r => r.name,
				),
			).toEqual(['Full', 'Paused', 'Reviews']);
			await expect(
				reports.buildAll(brandId, city.id, '2026-09', { configId: template.id }),
			).rejects.toThrow(NotFoundException);
		});

		it('builds the default template without an active configuration, and the full layout without one', async () => {
			const { city, brandId } = await brandIn('Banh Mi');
			let report = await reports.build(brandId, city.id, '2026-09');
			expect(report.name).toBe(FULL_REPORT_NAME);
			expect(report.config).toBeNull();
			expect(report.template).toBeNull();
			expect(sectionsOutput(report.sections)).toEqual(sectionsOutput(FULL_REPORT_SECTIONS()));

			const template = await templates.create({
				name: 'Short',
				sections: [{ kind: Kind.COVER }, { kind: Kind.CITY }],
			});
			const paused = await configs.create(brandId, { name: 'Paused' });
			await configs.update(paused.id, { status: ReportConfigStatusEnum.INACTIVE });
			report = await reports.build(brandId, city.id, '2026-09');
			expect(report.name).toBe('Short');
			expect(report.template?.id).toBe(template.id);
			expect(report.sections.map(s => s.kind)).toEqual(['cover', 'city']);
		});

		it('keeps reports when their configuration or template goes, the links null', async () => {
			const em = harness.orm.em;
			const { city, brandId } = await brandIn('Dumpling');
			await templates.create({ name: 'Full' });
			const template = await templates.create({
				name: 'Reviews',
				sections: [{ kind: Kind.COVER }, { kind: Kind.REVIEWS }],
			});
			const config = await configs.create(brandId, { templateId: template.id });
			const report = await reports.build(brandId, city.id, '2026-09');

			await templates.remove(template.id);
			em.clear();
			expect((await configs.get(config.id)).template).toBeNull();
			let kept = await em.findOneOrFail(Report, { id: report.id });
			expect(kept.template).toBeNull();
			expect(kept.config?.id).toBe(config.id);

			await configs.remove(config.id);
			em.clear();
			kept = await em.findOneOrFail(Report, { id: report.id });
			expect(kept.config).toBeNull();
			expect(kept.name).toBe('Reviews');
			expect(kept.sections.map(s => s.kind)).toEqual(['cover', 'reviews']);
		});

		it('tells the highlights only what the configuration shows', async () => {
			const em = harness.orm.em;
			const city = testCity(em);
			const brand = await brandFactory.create({ name: 'Udon Ya' });
			const venue = await venueFactory.create(
				{ name: 'Udon Ya' },
				{ associations: { city, brand } },
			);
			for (const [i, platform] of [
				SocialPlatformEnum.TIKTOK,
				SocialPlatformEnum.INSTAGRAM,
			].entries()) {
				const post = em.create(SocialPost, {
					city,
					externalId: `ut${i}`,
					platform,
					url: `https://example.com/u${i}`,
					postedAt: new Date('2026-09-10T12:00:00Z'),
					author: `fan${i}`,
					views: 100,
				});
				em.create(Mention, {
					post,
					venueName: venue.name,
					venue,
					brand,
					matchMethod: MentionMatchMethodEnum.EXACT,
					visited: true,
					sentiment: 'positive',
					summary: 'Good.',
				});
			}
			await em.flush();

			const config = await configs.create(brand.id, { name: 'Instagram only' });
			await configs.update(config.id, {
				sections: [
					{ kind: Kind.COVER, kpis: [ReportCoverKpiEnum.VIEWS] },
					{ kind: Kind.POSTS, platforms: [SocialPlatformEnum.INSTAGRAM] },
				],
			});
			const report = await reports.build(brand.id, city.id, '2026-09');

			const input = JSON.parse(highlightsAgent.generate.mock.calls[0][0] as string);
			expect(input.socialMedia.posts.map((p: { platform: string }) => p.platform)).toEqual([
				'instagram',
			]);
			// The cover still counts every platform
			expect(input.socialMedia.postsByOthers).toBe(2);
			expect(input.googleReviews).toBeUndefined();
			expect(input.competitors).toEqual([]);
			expect(input.topCreators).toEqual([]);
			// The stored data stays whole
			expect(report.data.posts).toHaveLength(2);
		});
	});
});
