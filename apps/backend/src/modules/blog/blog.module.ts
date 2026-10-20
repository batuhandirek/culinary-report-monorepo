import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { AuthModule } from 'src/modules/auth/auth.module.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import { ImagesModule } from 'src/modules/image/images.module.js';

import { BlogAdminController } from './controllers/admin.blog.controller.js';
import { BlogController } from './controllers/blog.controller.js';
import { BlogEntry } from './entities/blog-entry.entity.js';
import { BlogTag } from './entities/blog-tag.entity.js';
import { BlogService } from './services/blog.service.js';

@Module({
	imports: [
		AuthModule,
		ImagesModule,
		MikroOrmModule.forFeature([BlogEntry, BlogTag, User, Image]),
	],
	controllers: [BlogController, BlogAdminController],
	providers: [BlogService],
	exports: [BlogService],
})
export class BlogModule {}
