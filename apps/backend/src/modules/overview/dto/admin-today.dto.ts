import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

/**
 * Something waiting on an admin, and the page where it is handled. `urgent`: a customer or a
 * reply is waiting; `todo`: our own work; `info`: worth a look.
 */
export interface AdminTodoOutputDto {
	key: string;
	tone: 'urgent' | 'todo' | 'info';
	/** One line, numbers included */
	text: string;
	href: string;
	/** What to click: "Open", "Fix", "Send" */
	cta: string;
}

/** A post naming a place no venue matched yet, the most viewed first. */
export interface AdminUnmatchedPostOutputDto {
	postId: string;
	platform: SocialPlatformEnum;
	author?: string;
	views: number;
	postedAt: Date;
	/** The name the post used */
	name: string;
}

export interface AdminTodayOutputDto {
	reportMonth: string;
	todos: AdminTodoOutputDto[];
	/** Of the report month and the month in progress */
	unmatchedPosts: AdminUnmatchedPostOutputDto[];
}
