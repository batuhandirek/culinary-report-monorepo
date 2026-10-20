import { MikroORM } from '@mikro-orm/postgresql';

import { Test, TestingModule } from '@nestjs/testing';

import { AppModule } from '../app.module.js';

import { orm } from './orm.js';

let testingModule: TestingModule;
export const getTestingModule = async (): Promise<TestingModule> => {
	if (testingModule) {
		return testingModule;
	}

	testingModule = await Test.createTestingModule({
		imports: [AppModule],
		providers: [
			{
				provide: MikroORM,
				useValue: orm,
			},
		],
	}).compile();

	const ormInjected = testingModule.get(MikroORM);
	ormInjected.config.set('allowGlobalContext', true);

	return testingModule;
};

export const fail = () => {
	expect('').toBe('Should have thrown error');
};
