import { EntityRepository } from '@mikro-orm/postgresql';

import { Embedding } from '../entities/embedding.entity.js';

export class EmbeddingRepository extends EntityRepository<Embedding> {
	async findByInput(input: string): Promise<Embedding | null> {
		return this.findOne({ input });
	}
}
