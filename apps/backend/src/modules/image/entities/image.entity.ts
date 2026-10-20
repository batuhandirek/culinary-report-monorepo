import type { Opt } from '@mikro-orm/core';
import { Entity, Enum, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { MediaTypeEnum } from '../constants/media-type.enum.constant.js';
import { ImageRepository } from '../repositories/image.repository.js';

@Entity({
	tableName: 'images',
	repository: () => ImageRepository,
})
export class Image extends MikroOrmSimpleEntityAbstractClass {
	@Property({ type: 'text' })
	remoteId: string;

	@Property({ type: 'int' })
	width: number;

	@Property({ type: 'int' })
	height: number;

	@Property({ type: 'double' })
	aspectRatio: number;

	@Property({ type: 'text' })
	path: string;

	@Property({ type: 'text' })
	url: string;

	@Property({ type: 'text' })
	fileName: string;

	@Property({ type: 'text' })
	fileType: string;

	@Property({ type: 'int' })
	fileSize: number;

	// Nearly every row is a photo. A VIDEO is only ever created where a caller asked for one
	// (`ImageService.createMediaFromRemote`), so code reading an owner's photos never meets it.
	@Enum({ items: () => MediaTypeEnum, default: MediaTypeEnum.IMAGE })
	mediaType: MediaTypeEnum & Opt = MediaTypeEnum.IMAGE;

	// Seconds; videos only.
	@Property({ type: 'double', nullable: true })
	duration?: number;
}
