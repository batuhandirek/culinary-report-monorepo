import type { TopicKindEnum } from '../entities/topic.entity.js';

/** A topic as a chip names and links it */
export interface TopicRefOutputDto {
	key: string;
	label: string;
	kind: TopicKindEnum;
}
