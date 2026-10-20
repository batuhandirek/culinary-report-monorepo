import { randomBytes } from 'node:crypto';

import { QueryOrder, raw } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import { mainConfig } from 'src/config/main.config.js';

import { Report } from '../entities/report.entity.js';
import { ReportShare } from '../entities/report-share.entity.js';

// 16 random bytes are 22 base64url characters
const TOKEN_BYTES = 16;

/** The public page a share opens: `/r/<token>`. */
export const shareUrl = (token: string) => `${mainConfig.PUBLIC_APP_URL}/r/${token}`;

/**
 * The one entry point for private report links. A link is live until revoked; a revoked or
 * unknown token answers 404, the same either way, so a token can't be probed.
 */
@Injectable()
export class ReportShareService {
	constructor(private readonly em: EntityManager) {}

	/** A new link to a report. Flushes. */
	async create(reportId: string, createdById?: string): Promise<ReportShare> {
		const report = await this.em.findOneOrFail(Report, { id: reportId });
		const share = this.em.create(ReportShare, {
			report,
			token: randomBytes(TOKEN_BYTES).toString('base64url'),
			createdBy: createdById ?? null,
		});
		await this.em.flush();
		await this.em.populate(share, ['createdBy']);
		return share;
	}

	/** The report's newest live link, or a new one. For sending the report out. Flushes. */
	async ensureShare(reportId: string, createdById?: string): Promise<ReportShare> {
		const live = await this.em.findOne(
			ReportShare,
			{ report: reportId, revokedAt: null },
			{ orderBy: { createdAt: QueryOrder.DESC } },
		);
		return live ?? this.create(reportId, createdById);
	}

	/** Every link a report has had, newest first, revoked ones included. */
	list(reportId: string): Promise<ReportShare[]> {
		return this.em.find(
			ReportShare,
			{ report: reportId },
			{ populate: ['createdBy'], orderBy: { createdAt: QueryOrder.DESC } },
		);
	}

	/** Turns a link off for good. Revoking twice keeps the first time. Flushes. */
	async revoke(reportId: string, shareId: string): Promise<ReportShare> {
		const share = await this.em.findOneOrFail(
			ReportShare,
			{ id: shareId, report: reportId },
			{ populate: ['createdBy'] },
		);
		share.revokedAt ??= new Date();
		await this.em.flush();
		return share;
	}

	/** The report behind a live link, with its brand and city. 404 when the token is unknown or revoked. */
	async findReport(token: string): Promise<Report> {
		const share = await this.em.findOne(
			ReportShare,
			{ token, revokedAt: null },
			{ populate: ['report.brand', 'report.city'] },
		);
		if (!share) throw new NotFoundException('This link does not exist or was turned off');
		return share.report;
	}

	/** Counts an open of a live link, in one statement so concurrent opens all count. 404 like `findReport`. */
	async recordOpen(token: string, at = new Date()): Promise<void> {
		const updated = await this.em.nativeUpdate(
			ReportShare,
			{ token, revokedAt: null },
			{ openCount: raw<number>('open_count + 1'), lastOpenedAt: at },
		);
		if (!updated) throw new NotFoundException('This link does not exist or was turned off');
	}
}
