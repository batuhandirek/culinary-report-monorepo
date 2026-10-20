import { Injectable, NotFoundException } from '@nestjs/common';

import {
	SitemapEntriesOutputDto,
	SitemapEntryOutputDto,
	SitemapSectionsOutputDto,
} from '../dto/sitemap.output.dto.js';

/** A group of public pages search engines should know about, e.g. published reports. */
export interface SitemapSection {
	/** Lowercase letters only: it becomes part of the sitemap file name. */
	name: string;
	count(): Promise<number>;
	list(offset: number, limit: number): Promise<SitemapEntryOutputDto[]>;
}

/**
 * The dynamic part of the sitemap. A module with public pages registers a section here
 * (from its own `onModuleInit`); the frontend's `/sitemap.xml` lists one file per page of
 * every section next to its static pages.
 */
@Injectable()
export class SitemapService {
	private readonly sections = new Map<string, SitemapSection>();

	register(section: SitemapSection) {
		if (!/^[a-z]+$/.test(section.name)) {
			throw new Error(`Sitemap section name must be lowercase letters: ${section.name}`);
		}
		this.sections.set(section.name, section);
	}

	async getSections(): Promise<SitemapSectionsOutputDto> {
		const items = await Promise.all(
			[...this.sections.values()].map(async section => ({
				name: section.name,
				totalItems: await section.count(),
			})),
		);
		return { items };
	}

	async getEntries(name: string, page: number, size: number): Promise<SitemapEntriesOutputDto> {
		const section = this.sections.get(name);
		if (!section) throw new NotFoundException(`No sitemap section ${name}`);
		const [items, totalItems] = await Promise.all([
			section.list((page - 1) * size, size),
			section.count(),
		]);
		return { items, totalItems };
	}
}
