import type { ClaimPartsInputSource } from '../agents/claim-parts.agent.js';

/** The source's other claims shown beside one: this many before it and after it at most */
export const CLAIM_PARTS_NEIGHBOURS = 15;

/** One question to agent B: a claim of a source, and the message that asks about it */
export interface ClaimPartsQuestion {
	id: string;
	text: string;
	message: string;
}

/**
 * Agent B's questions for one source's claims: one claim a call (a call answering many claims by
 * their ids drops some and carries a dish from one onto another), each with the source's kind,
 * the place it is about and its other claims nearby as plain context. What `StatementPartsService`
 * sends, and the eval too.
 */
export const claimPartsQuestions = (source: ClaimPartsInputSource): ClaimPartsQuestion[] =>
	source.claims.map((claim, k) => ({
		id: claim.id,
		text: claim.text,
		message: JSON.stringify({
			source: source.kind,
			place: source.venue,
			otherClaims: [
				...source.claims.slice(Math.max(0, k - CLAIM_PARTS_NEIGHBOURS), k),
				...source.claims.slice(k + 1, k + 1 + CLAIM_PARTS_NEIGHBOURS),
			].map(c => c.text),
			claim: { text: claim.text, ...(claim.quote && { quote: claim.quote }) },
		}),
	}));
