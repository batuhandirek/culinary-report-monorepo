import { defineConfig } from '@mikro-orm/postgresql';

import { mainConfig } from 'src/config/main.config.js';
import { CredentialVerificationRequest } from 'src/modules/auth/entities/credential-verification-request.entity.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';
import { Image } from 'src/modules/image/entities/image.entity.js';

export default defineConfig({
	entities: [User, UserSession, CredentialVerificationRequest, Image],
	dbName: mainConfig.DB_NAME,
	host: mainConfig.DB_HOST,
	user: mainConfig.DB_USERNAME,
	password: mainConfig.DB_PASSWORD,
	port: mainConfig.DB_PORT,

	allowGlobalContext: true,

	migrations: {
		tableName: 'migrations',

		snapshot: false,
		dropTables: true,
		allOrNothing: true,

		path: 'dist/migrations',
		pathTs: 'src/migrations',
	},
});
