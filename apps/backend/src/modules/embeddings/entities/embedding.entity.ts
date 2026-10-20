import { Entity, Index, Property } from '@mikro-orm/decorators/legacy';

import { HalfvecType } from 'pgvector/mikro-orm';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { EmbeddingRepository } from '../repositories/embedding.repository.js';

@Entity({
	tableName: 'embeddings',
	repository: () => EmbeddingRepository,
})
export class Embedding extends MikroOrmSimpleEntityAbstractClass {
	@Index()
	@Property({ type: 'text', unique: true })
	input: string;

	@Property({ type: HalfvecType, length: 3072, hidden: true })
	embedding: number[];

	@Property({ type: 'text' })
	model: string;

	@Property({ type: 'int' })
	dimensions: number;

	@Property({ type: 'int' })
	tokensUsed: number;
}
