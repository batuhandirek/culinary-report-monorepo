import type { AnalystMentionType, AnalystMessageStatus, AnalystPartData } from 'sdk';
import type { tags } from 'typia';

/** The wire shapes mirror `sdk`'s `Analyst*Payload` (what the socket sends), dates as `Date` here */
export interface AdminAnalystPartOutputDto {
	id: string;
	position: number;
	streaming: boolean;
	data: AnalystPartData;
	createdAt: Date;
}

export interface AdminAnalystMessageOutputDto {
	id: string;
	thread: { id: string };
	author: { id: string; firstName: string; roles: string[] };
	status: AnalystMessageStatus;
	model?: string;
	usd?: number;
	usage?: {
		inputTokens: number;
		outputTokens: number;
		cachedInputTokens: number;
		cacheWriteTokens: number;
		steps: number;
		queries: number;
	};
	createdAt: Date;
	finishedAt?: Date;
	parts: AdminAnalystPartOutputDto[];
}

export interface AdminAnalystThreadOutputDto {
	id: string;
	title: string;
	owner: { id: string; firstName: string };
	usd: number;
	lastMessageAt: Date;
	createdAt: Date;
}

export interface AdminAnalystThreadsInputDto {
	page: number & tags.Type<'uint32'> & tags.Minimum<1>;
	size: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<100>;
	/** Words in the title */
	q?: string & tags.MaxLength<200>;
}

export interface AdminAnalystThreadsOutputDto {
	items: AdminAnalystThreadOutputDto[];
	total: number;
}

export interface AdminAnalystThreadDetailOutputDto {
	thread: AdminAnalystThreadOutputDto;
	/** Oldest first */
	messages: AdminAnalystMessageOutputDto[];
}

export interface AdminAnalystAskInputDto {
	/** The question; `@Venue:<id>`, `@Brand:<id>`, `@Aspect:<key>`, `@Topic:<key>`, … name rows */
	text: string & tags.MinLength<1> & tags.MaxLength<4000>;
	/** A follow-up in this thread; none starts a thread */
	threadId?: string & tags.Format<'uuid'>;
}

export interface AdminAnalystAskOutputDto {
	thread: AdminAnalystThreadOutputDto;
	question: AdminAnalystMessageOutputDto;
	answer: AdminAnalystMessageOutputDto;
}

export interface AdminAnalystRenameInputDto {
	title: string & tags.MinLength<1> & tags.MaxLength<200>;
}

export interface AdminAnalystMentionsInputDto {
	q: string & tags.MinLength<1> & tags.MaxLength<100>;
	type?: AnalystMentionType;
	cityId?: string & tags.Format<'uuid'>;
}

export interface AdminAnalystMentionOutputDto {
	type: AnalystMentionType;
	id: string;
	ref: string;
	label: string;
	detail?: string;
	/** What the composer inserts: `@Venue:<id>` */
	token: string;
}

export interface AdminAnalystMentionsOutputDto {
	items: AdminAnalystMentionOutputDto[];
}
