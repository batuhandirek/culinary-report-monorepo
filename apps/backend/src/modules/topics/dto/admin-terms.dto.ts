import { tags } from 'typia';

import type { EdgeType } from '../constants/topic-edge.constant.js';
import type { TermDecider } from '../entities/term.entity.js';
import type { TopicKindEnum } from '../entities/topic.entity.js';

/** Which terms the list shows: `unlinked` = decided with no topic and no modifier, `linked`, `pending` = not decided yet */
export type AdminTermStatus = 'unlinked' | 'linked' | 'pending' | 'all';

export interface AdminGetTermsInputDto {
	cityId: string & tags.Format<'uuid'>;
	status?: AdminTermStatus;
	/** A search in the wording or its key */
	q?: string & tags.MaxLength<80>;
	/** Only terms whose main topic or a modifier is this topic */
	topicKey?: string & tags.MaxLength<80>;
	/** Only narrower terms proposed as this topic of their own (`proposedLabel`) */
	proposal?: string & tags.MaxLength<80>;
	offset?: number & tags.Type<'uint32'>;
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
}

export interface AdminTermTopicOutputDto {
	key: string;
	label: string;
	kind: string;
}

/** What a narrower wording is (`is_a`) or has (`has`) beside its main topic */
export interface AdminTermModifierOutputDto extends AdminTermTopicOutputDto {
	type: EdgeType;
}

/** One wording, with its topic and how many of the city's statements and venues' Google tags carry it */
export interface AdminTermOutputDto {
	id: number;
	key: string;
	name: string;
	/** Its main topic; absent for none, or while not decided */
	topic?: AdminTermTopicOutputDto;
	/** True: the wording is `topic`, spelled or translated. False: something narrower under it */
	exact: boolean;
	modifiers: AdminTermModifierOutputDto[];
	/** The label and kind a narrower wording would have as a topic of its own: what promotion groups by */
	proposedLabel?: string;
	proposedKind?: string;
	decidedBy?: TermDecider;
	/** The city's statements naming it (food parts) */
	notes: number;
	/** The city's venues whose Google "people often mention" tags carry it */
	tagVenues: number;
}

export interface AdminTermProposalOutputDto {
	label: string;
	/** Narrower wordings proposed as it */
	terms: number;
	/** Their statements and tag venues together */
	uses: number;
	examples: string[];
}

export interface AdminTermsOutputDto {
	/** The city's wordings and their uses, and how many point at a topic */
	summary: {
		terms: number;
		uses: number;
		linkedTerms: number;
		linkedUses: number;
		pendingTerms: number;
	};
	/** What the city's narrower wordings would be as topics of their own, most used first: a group becomes a topic at 15 uses from 5 sources */
	proposals: AdminTermProposalOutputDto[];
	terms: AdminTermOutputDto[];
	total: number;
}

/** A term after an admin's decision: the list carries the counts, this answer doesn't */
export type AdminUpdatedTermOutputDto = Omit<AdminTermOutputDto, 'notes' | 'tagVenues'>;

/**
 * An admin's decision: the wording's main topic (`topicKey`, null = none), whether it is that topic
 * (`exact`; the default with a topic and no modifiers) and what else a narrower one is or has
 * (`modifiers`, a type left out defaults from the target's kind); or `auto` for the name match and
 * the agent.
 */
export interface AdminChangeTermInputDto {
	topicKey?: (string & tags.MaxLength<80>) | null;
	exact?: boolean;
	modifiers?: AdminTermModifierInputDto[] & tags.MaxItems<5>;
	auto?: boolean;
}

export interface AdminTermModifierInputDto {
	topicKey: string & tags.MaxLength<80>;
	type?: EdgeType;
}

/** "Make it a topic of its own": the label and kind override what the agent proposed (a dish named after the wording by default) */
export interface AdminPromoteTermInputDto {
	label?: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind?: TopicKindEnum;
}
