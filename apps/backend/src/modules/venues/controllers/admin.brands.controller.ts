import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminBrandVenueInputDto,
	AdminBrandVenuesInputDto,
	AdminConfirmBrandInputDto,
	AdminDismissBrandInputDto,
	AdminListBrandSuggestionsInputDto,
	AdminSearchBrandInputDto,
	AdminUpdateBrandInputDto,
} from '../dto/admin-brand.input.dto.js';
import {
	AdminBrandBranchOutputDto,
	AdminBrandListItemOutputDto,
	AdminBrandOutputDto,
	AdminBrandSuggestionOutputDto,
} from '../dto/admin-brand.output.dto.js';
import {
	AdminAddCompetitorInputDto,
	AdminListCompetitorSuggestionsInputDto,
} from '../dto/admin-competitor.input.dto.js';
import {
	AdminCompetitorOutputDto,
	AdminCompetitorSuggestionOutputDto,
	AdminCompetitorVenueOutputDto,
} from '../dto/admin-competitor.output.dto.js';
import type { AdminVenueListItemOutputDto } from '../dto/admin-venue.output.dto.js';
import type { Brand } from '../entities/brand.entity.js';
import type { BrandCompetitor } from '../entities/brand-competitor.entity.js';
import type { Venue } from '../entities/venue.entity.js';
import { BrandService } from '../services/brand.service.js';
import { CompetitorService } from '../services/competitor.service.js';

/** Brands: the Brands page (chains and suggestions), a brand's page and the venue page's Brand panel. */
@Controller('/admin/brands')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminBrandsController {
	constructor(
		private readonly em: EntityManager,
		private readonly brandService: BrandService,
		private readonly competitorService: CompetitorService,
	) {}

	/** Groups of a city's venues that look like one brand; nothing is saved until confirmed. */
	@TypedRoute.Get('/suggestions')
	async listBrandSuggestions(
		@TypedQuery() query: AdminListBrandSuggestionsInputDto,
	): Promise<AdminBrandSuggestionOutputDto[]> {
		const suggestions = await this.brandService.suggestions(query.cityId);
		const branches = await this.branches(suggestions.flatMap(s => s.venues));
		return suggestions.map(({ group, venues }) => ({
			key: group.key,
			name: group.name,
			reason: group.reason,
			venues: venues.map(v => branches.get(v.id)!),
		}));
	}

	/**
	 * Merges the venues' brands into one chain; their records move onto it, its mentions are
	 * matched again and the cities scored again.
	 */
	@TypedRoute.Post('/')
	async confirmBrand(@TypedBody() body: AdminConfirmBrandInputDto): Promise<AdminBrandOutputDto> {
		const brand = await this.brandService.merge(body);
		return this.detail(brand);
	}

	/** "Not one brand": the suggestion never comes back. */
	@TypedRoute.Post('/dismissals')
	async dismissBrandSuggestion(@TypedBody() body: AdminDismissBrandInputDto): Promise<void> {
		await this.brandService.dismiss(body);
	}

	@TypedRoute.Get('/:id')
	async getBrand(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.get(id));
	}

	@TypedRoute.Patch('/:id')
	async updateBrand(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateBrandInputDto,
	): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.update(id, body));
	}

	/** Undoes a chain: every branch but the most reviewed becomes a brand of its own again. */
	@TypedRoute.Post('/:id/split')
	async splitBrand(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.split(id));
	}

	@TypedRoute.Post('/:id/branches')
	async addBrandBranches(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminBrandVenuesInputDto,
	): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.addBranches(id, body.venueIds));
	}

	@TypedRoute.Delete('/:id/branches/:venueId')
	async removeBrandBranch(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('venueId') venueId: string & tags.Format<'uuid'>,
	): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.removeBranch(id, venueId));
	}

	/** "Not a branch": a namesake, never offered again (and taken off when it was a branch). */
	@TypedRoute.Post('/:id/exclusions')
	async excludeBrandVenue(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminBrandVenueInputDto,
	): Promise<AdminBrandOutputDto> {
		return this.detail(await this.brandService.removeBranch(id, body.venueId, true));
	}

	/**
	 * "Find branches": queues one Google Maps search for the name in the city (about $0.20,
	 * half a minute); `branchesSearchedAt` moves when it is done.
	 */
	@TypedRoute.Post('/:id/searches')
	async searchBrandBranches(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminSearchBrandInputDto,
	): Promise<void> {
		await this.brandService.queueSearch(id, body.cityId);
	}

	/** The places and brands this brand's reports compare it with. */
	@TypedRoute.Get('/:id/competitors')
	async listBrandCompetitors(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminCompetitorOutputDto[]> {
		const links = await this.competitorService.list(id);
		await this.em.populate(
			links.flatMap(l => (l.venue ? [l.venue] : [])),
			['mentionCount', 'brand'],
		);
		return links.map(link => this.competitor(link));
	}

	/** Adds a place or a whole brand as competition (`venueId` or `brandId`), for the brand or one branch (`branchId`). */
	@TypedRoute.Post('/:id/competitors')
	async addBrandCompetitor(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminAddCompetitorInputDto,
	): Promise<AdminCompetitorOutputDto[]> {
		if (!body.venueId === !body.brandId) throw new BadRequestException('Give a venue or a brand');
		await this.competitorService.add(
			id,
			body.venueId ? { venueId: body.venueId } : { brandId: body.brandId! },
			undefined,
			body.branchId,
		);
		return this.listBrandCompetitors(id);
	}

	@TypedRoute.Delete('/:id/competitors/:competitorId')
	async removeBrandCompetitor(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('competitorId') competitorId: number & tags.Type<'uint32'>,
	): Promise<AdminCompetitorOutputDto[]> {
		await this.competitorService.remove(id, competitorId);
		return this.listBrandCompetitors(id);
	}

	/** Five likely competitors in a city to add with one click; nothing is added here. */
	@TypedRoute.Get('/:id/competitor-suggestions')
	async listBrandCompetitorSuggestions(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminListCompetitorSuggestionsInputDto,
	): Promise<AdminCompetitorSuggestionOutputDto[]> {
		const suggestions = await this.competitorService.suggest(id, query.cityId, 5, query.branchId);
		await this.em.populate(
			suggestions.map(s => s.venue),
			['favicon', 'brand', 'brand.branches'],
		);
		return suggestions.map(s => ({
			venue: { ...this.venueItem(s.venue), mentionCount: s.mentions },
			brandBranches: s.venue.brand.branches.getItems().filter(v => !v.closed).length,
			score: s.score,
			reasons: s.reasons,
		}));
	}

	private competitor(link: BrandCompetitor): AdminCompetitorOutputDto {
		const rival = link.rival;
		const open = rival?.branches.getItems().filter(v => !v.closed) ?? [];
		return {
			id: link.id,
			pickedBy: link.pickedBy,
			...(link.branch && {
				branch: {
					id: link.branch.id,
					name: link.branch.name,
					...(link.branch.street && { street: link.branch.street }),
				},
			}),
			...(link.venue && {
				venue: {
					...this.venueItem(link.venue),
					city: { id: link.venue.city.id, name: link.venue.city.name, slug: link.venue.city.slug },
				} as AdminCompetitorVenueOutputDto,
			}),
			...(rival && {
				rival: {
					id: rival.id,
					name: rival.name,
					branches: open.length,
					cities: Object.values(Object.fromEntries(open.map(v => [v.city.id, v.city]))).map(c => ({
						id: c.id,
						name: c.name,
						slug: c.slug,
					})),
				},
			}),
		};
	}

	private venueItem(venue: Venue): AdminVenueListItemOutputDto {
		return {
			...(wrap(venue).serialize({
				skipNull: true,
				forceObject: true,
				populate: ['favicon', 'brand'],
			}) as unknown as Omit<AdminVenueListItemOutputDto, 'mentionCount'>),
			mentionCount: venue.mentionCount ?? 0,
		};
	}

	private async detail(brand: Brand): Promise<AdminBrandOutputDto> {
		const candidates = await this.brandService.candidates(brand);
		const branches = await this.branches([...brand.branches.getItems(), ...candidates]);
		const brandOnly = await this.brandService.brandOnlyMentionCounts([brand.id]);
		return {
			...this.listItem(brand, branches, brandOnly),
			branchesSearchedAt: brand.branchesSearchedAt,
			...(brand.leadSignals && { leadSignals: brand.leadSignals }),
			candidates: candidates.map(v => branches.get(v.id)!),
		};
	}

	private listItem(
		brand: Brand,
		branches: Map<string, AdminBrandBranchOutputDto>,
		brandOnly: Map<string, number>,
	): AdminBrandListItemOutputDto {
		return {
			...(wrap(brand).serialize({
				skipNull: true,
				forceObject: true,
				exclude: ['branches', 'branchesSearchedAt', 'excludedVenueIds', 'leadSignals'],
			}) as unknown as Omit<AdminBrandListItemOutputDto, 'branches' | 'brandOnlyMentions'>),
			branches: brand.branches.getItems().map(v => branches.get(v.id)!),
			brandOnlyMentions: brandOnly.get(brand.id) ?? 0,
		};
	}

	/** Venues as branch rows, with their mention counts. */
	private async branches(venues: Venue[]): Promise<Map<string, AdminBrandBranchOutputDto>> {
		const counts = await this.brandService.mentionCounts(venues.map(v => v.id));
		return new Map(
			venues.map(v => [
				v.id,
				{
					...(wrap(v).serialize({
						skipNull: true,
						forceObject: true,
						populate: ['city', 'favicon'],
					}) as unknown as Omit<AdminBrandBranchOutputDto, 'mentions'>),
					mentions: counts.get(v.id) ?? 0,
				},
			]),
		);
	}
}
