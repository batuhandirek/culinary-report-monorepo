import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { Image } from './entities/image.entity.js';
import { imagekitProvider } from './providers/imagekit.provider.js';
import { ImageService } from './services/image.service.js';

@Module({
	imports: [MikroOrmModule.forFeature([Image])],
	controllers: [],
	providers: [imagekitProvider, ImageService],
	exports: [ImageService],
})
export class ImagesModule {}
