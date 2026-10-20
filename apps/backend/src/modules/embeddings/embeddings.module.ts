import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { LLMModule } from 'src/modules/llm/llm.module.js';

import { Embedding } from './entities/embedding.entity.js';
import { EmbeddingsService } from './services/embeddings.service.js';

@Module({
	imports: [LLMModule, MikroOrmModule.forFeature([Embedding])],
	controllers: [],
	providers: [EmbeddingsService],
	exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
