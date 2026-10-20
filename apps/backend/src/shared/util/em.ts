import { EntityManager } from '@mikro-orm/core';

export class EntityManagerManager {
	private entityManager?: EntityManager;

	setEntityManager(entityManager: EntityManager) {
		this.entityManager = entityManager;
	}

	get em(): EntityManager {
		if (!this.entityManager) throw new Error('Entity Manager not initialised');
		return this.entityManager;
	}
}

export const entityManagerManager = new EntityManagerManager();
export const getEntityManager = (): EntityManager => {
	return entityManagerManager.em;
};
