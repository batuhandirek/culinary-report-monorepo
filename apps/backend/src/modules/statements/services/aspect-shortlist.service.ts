import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { EmbeddingsService } from 'src/modules/llm/services/embeddings.service.js';

import {
	EMBEDDING_REQUEST_CLAIMS,
	STATEMENT_EMBEDDING_DIMENSIONS,
} from '../constants/embeddings.constant.js';
import {
	ASPECT_SHORTLIST_SIZE,
	aspectEmbeddingText,
	aspectShortlist,
	aspectVectors,
} from '../util/aspect-shortlist.js';
import type { ClaimLabelAspect } from '../util/claim-labels.js';

/**
 * The aspects offered to the claim-labels classifier for each claim (`aspectShortlist`): the
 * `ASPECT_SHORTLIST_SIZE` whose description is closest to the claim's text, with their roots (the
 * user's call, 2026-11-09: about half of Jev's cost; at 8 the eval lost 3–5 points of exact aspect).
 * Production (`StatementPartsService.read`, from the claims' stored vectors) and the eval
 * (`--aspect-shortlist`, from texts) both go through it, so the eval scores what production offers.
 * The aspects' descriptions are embedded once a process, kept by their text, so an edited hint or
 * a new aspect is embedded again.
 */
@Injectable()
export class AspectShortlistService {
	private readonly aspectVectorsByText = new Map<string, number[]>();

	constructor(private readonly embeddings: EmbeddingsService) {}

	/** Each claim's shortlist by its id, from its vector (`text-embedding-3-large` at the claims' dimensions) */
	async forVectors(
		aspects: ClaimLabelAspect[],
		claims: { id: string; vector: ArrayLike<number> }[],
		size = ASPECT_SHORTLIST_SIZE,
	): Promise<Map<string, string[]>> {
		if (!claims.length) return new Map();
		const vectors = aspectVectors(aspects, await this.aspectVectorsOf(aspects));
		return new Map(claims.map(c => [c.id, aspectShortlist(c.vector, vectors, size)]));
	}

	/** The same for claims not stored (the eval's): their texts embedded now */
	async forTexts(
		aspects: ClaimLabelAspect[],
		claims: { id: string; text: string }[],
		size = ASPECT_SHORTLIST_SIZE,
	): Promise<Map<string, string[]>> {
		const vectors = await this.embed(claims.map(c => c.text));
		return this.forVectors(
			aspects,
			claims.map((c, i) => ({ id: c.id, vector: vectors[i] })),
			size,
		);
	}

	private async aspectVectorsOf(aspects: ClaimLabelAspect[]): Promise<number[][]> {
		const texts = aspects.map(aspectEmbeddingText);
		const missing = _.uniq(texts.filter(t => !this.aspectVectorsByText.has(t)));
		if (missing.length) {
			const embedded = await this.embed(missing);
			missing.forEach((text, i) => this.aspectVectorsByText.set(text, embedded[i]));
		}
		return texts.map(t => this.aspectVectorsByText.get(t)!);
	}

	/** Texts embedded as claims are, in requests of `EMBEDDING_REQUEST_CLAIMS` */
	private async embed(texts: string[]): Promise<number[][]> {
		const out: number[][] = [];
		for (const chunk of _.chunk(texts, EMBEDDING_REQUEST_CLAIMS))
			out.push(
				...(
					await this.embeddings.embedMany(chunk, {
						dimensions: STATEMENT_EMBEDDING_DIMENSIONS,
					})
				).embeddings,
			);
		return out;
	}
}
