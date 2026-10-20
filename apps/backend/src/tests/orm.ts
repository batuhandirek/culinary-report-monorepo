import { MikroORM } from '@mikro-orm/postgresql';

import ormConfig from './mikro-orm.test.config.js';

export const orm = new MikroORM(ormConfig);
