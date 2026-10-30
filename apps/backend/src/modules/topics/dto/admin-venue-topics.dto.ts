import type { TopicKindEnum } from '../entities/topic.entity.js';

export interface AdminVenueTopicOutputDto {
	key: string;
	label: string;
	kind: TopicKindEnum;
	/** What gives it: its Google categories, its posts, its menu, Google's review tags, or an admin */
	source: 'category' | 'mentions' | 'menu' | 'reviews' | 'manual';
	/** 1 for its main category or an admin's tag, 0.5 for another category, else its share of the posts, menu items or review tags */
	score: number;
	/** The one kind of food it is known for */
	primary: boolean;
}

export interface AdminVenueTopicsOutputDto {
	tags: AdminVenueTopicOutputDto[];
	/** Topics an admin keeps off it */
	excluded: { key: string; label: string }[];
}

export interface AdminChangeVenueTopicInputDto {
	/** `tag` adds the topic, `exclude` keeps it off, `clear` lets categories and posts decide again */
	change: 'tag' | 'exclude' | 'clear';
}
