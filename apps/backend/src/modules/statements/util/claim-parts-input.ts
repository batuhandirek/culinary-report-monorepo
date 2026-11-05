/** One claim as the labelling pass sends it */
export interface ClaimPartsInputClaim {
	id: string;
	text: string;
	/** The source's own words, in its language, when the claim has them */
	quote?: string;
}

/** One source's claims, so a claim can be read next to its siblings ("crispy and juicy" after "we had the wings") */
export interface ClaimPartsInputSource {
	/** review | post | comment | press */
	kind: string;
	/** The place the claims are about, when there is one */
	venue: string | null;
	claims: ClaimPartsInputClaim[];
}

/** The source's other claims shown beside one: this many before it and after it at most */
export const CLAIM_PARTS_NEIGHBOURS = 15;

/**
 * What one claim is read with: the source's kind, its place, its neighbours, the claim and its quote
 * (a type, not an interface, so it is a JSON object a decision model's state takes)
 */
export type ClaimPartsState = {
	source: string;
	place: string | null;
	otherClaims: string[];
	claim: { text: string; quote?: string };
};

/** One claim to label: a claim of a source, with what it is read beside */
export interface ClaimPartsQuestion {
	id: string;
	text: string;
	/** The claim with its context: what a classifier reads as its state */
	state: ClaimPartsState;
}

/**
 * The labelling questions for one source's claims: one claim a call (a call answering many claims
 * by their ids drops some and carries a dish from one onto another), each with the source's kind,
 * the place it is about and its other claims nearby as plain context: the claim-labels classifier's
 * state, as `StatementPartsService` and the eval send it.
 */
export const claimPartsQuestions = (source: ClaimPartsInputSource): ClaimPartsQuestion[] =>
	source.claims.map((claim, k) => {
		const state: ClaimPartsState = {
			source: source.kind,
			place: source.venue,
			otherClaims: [
				...source.claims.slice(Math.max(0, k - CLAIM_PARTS_NEIGHBOURS), k),
				...source.claims.slice(k + 1, k + 1 + CLAIM_PARTS_NEIGHBOURS),
			].map(c => c.text),
			claim: { text: claim.text, ...(claim.quote && { quote: claim.quote }) },
		};
		return { id: claim.id, text: claim.text, state };
	});
