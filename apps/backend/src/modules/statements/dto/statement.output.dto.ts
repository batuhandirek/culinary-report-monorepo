import type { EdgeType } from 'src/modules/topics/constants/topic-edge.constant.js';

import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import type { StatementSubject, StatementUnit } from '../entities/statement.entity.js';
import type { StatementPartRole } from '../entities/statement-part.entity.js';

/** A topic a part is about: an aspect, or one of a wording's topics. Its page is `/admin/aspects/<key>` for an aspect, `/admin/topics/<key>` for a kind of food */
export interface StatementTopicOutputDto {
	key: string;
	label: string;
	/** `Topic.kind`: aspect, dish, cuisine, … */
	kind: string;
	/** Its display parent, the topic its first `is_a` edge points at (an aspect's root, a dish's cuisine); absent for a root */
	parent?: { key: string; label: string };
}

/**
 * One thing a statement is about (a `StatementPart` row): an `aspect` part has `topic`; a `food`
 * part has `term` (the wording as the source spelled it) with its main `topic` (absent until
 * decided, and for a wording that is none), whether the wording is that topic (`exact`) or
 * something narrower, and what else a narrower one is or has (`modifiers`). Every route serving
 * statements populates `STATEMENT_POPULATE`.
 */
export interface StatementPartOutputDto {
	role: StatementPartRole;
	topic?: StatementTopicOutputDto;
	term?: {
		key: string;
		name: string;
		exact: boolean;
		topic?: StatementTopicOutputDto;
		modifiers: { type: EdgeType; rank: number; topic: StatementTopicOutputDto }[];
	};
}

/**
 * One claim a source makes (a `Statement` row). Praise is `positive`, a complaint `negative`, a
 * noted fact `neutral` or `mixed`; a claim of kind `change` is no praise or complaint whatever its
 * sentiment; a dish-only statement has no `text`. Pages group them by sentiment and kind themselves.
 */
export interface StatementOutputDto {
	id: number;
	/** The claim, in English; absent on a dish-only statement */
	text?: string;
	/** The source's own words for it, in its language; absent when agent A gave none that is verbatim */
	quote?: string;
	/** Absent until agent B read it, and on a Google tag */
	sentiment?: Sentiment;
	subject: StatementSubject;
	/** What sort of thing it says (opinion, fact, change, new item, deal, event, question, verdict); absent until agent B read it */
	kind?: StatementKind;
	/** The number it states: minutes for a wait, the price for a price */
	amount?: number;
	unit?: StatementUnit;
	parts: StatementPartOutputDto[];
}
