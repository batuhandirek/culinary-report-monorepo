import type { FoodTopicKindEnum } from '../entities/food-topic.entity.js';

export interface AdminVenueFoodTopicOutputDto {
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
	/** What gives it: its Google categories, its posts, or an admin */
	source: 'category' | 'mentions' | 'manual';
	/** 1 for its main category or an admin's tag, 0.5 for another category, else its share of the posts */
	score: number;
	/** The one kind of food it is known for */
	primary: boolean;
}

export interface AdminVenueFoodTopicsOutputDto {
	tags: AdminVenueFoodTopicOutputDto[];
	/** Topics an admin keeps off it */
	excluded: { key: string; label: string }[];
}

export interface AdminChangeVenueFoodTopicInputDto {
	/** `tag` adds the topic, `exclude` keeps it off, `clear` lets categories and posts decide again */
	change: 'tag' | 'exclude' | 'clear';
}
