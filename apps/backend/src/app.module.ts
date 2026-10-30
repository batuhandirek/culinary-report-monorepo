import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PgBossModule } from 'src/modules/pgboss/pgboss.module.js';

import { mainConfig } from './config/main.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BacklogModule } from './modules/backlog/backlog.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { BlogModule } from './modules/blog/blog.module.js';
import { CitiesModule } from './modules/cities/cities.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module.js';
import { FoodTrendsModule } from './modules/food-trends/food-trends.module.js';
import { HighlightsModule } from './modules/highlights/highlights.module.js';
import { HealthCheckModule } from './modules/health-check/health-check.module.js';
import { LandingModule } from './modules/landing/landing.module.js';
import { NewsletterModule } from './modules/newsletter/newsletter.module.js';
import { NotificationsModule } from './modules/notification/notifications.module.js';
import { OtpModule } from './modules/otp/otp.module.js';
import { OutreachModule } from './modules/outreach/outreach.module.js';
import { OverviewModule } from './modules/overview/overview.module.js';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { PortalModule } from './modules/portal/portal.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { S3Module } from './modules/s3/s3.module.js';
import { SitemapModule } from './modules/sitemap/sitemap.module.js';
import { SocialModule } from './modules/social/social.module.js';
import { TopicsModule } from './modules/topics/topics.module.js';
import { TrendsModule } from './modules/trends/trends.module.js';
import { TurnstileModule } from './modules/turnstile/turnstile.module.js';
import { VenuesModule } from './modules/venues/venues.module.js';
import mikroOrmConfig from './mikro-orm.config.js';
import sdk from './tracing.js';

@Module({
	imports: [
		EventEmitterModule.forRoot({ wildcard: false }),
		MikroOrmModule.forRoot(mikroOrmConfig),
		PgBossModule.forRootAsync({
			useFactory: () => ({
				host: mainConfig.DB_HOST,
				port: mainConfig.DB_PORT,
				user: mainConfig.DB_USERNAME,
				password: mainConfig.DB_PASSWORD,
				database: mainConfig.DB_NAME,
				ssl: mainConfig.DB_SSL ? { rejectUnauthorized: false } : undefined,
			}),
		}),

		// Utility modules
		EmailModule,
		OtpModule,
		EmbeddingsModule,
		S3Module,
		TurnstileModule,
		// SimulationModule,

		// Modules with controllers
		HealthCheckModule,
		AuthModule,
		NotificationsModule,
		SitemapModule,

		// Munchwerk
		CitiesModule,
		VenuesModule,
		SocialModule,
		ReportsModule,
		PipelineModule,
		BacklogModule,
		FeedbackModule,
		OutreachModule,
		PortalModule,
		OverviewModule,
		TopicsModule,
		TrendsModule,
		HighlightsModule,
		FoodTrendsModule,
		LandingModule,
		NewsletterModule,
		BlogModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule implements OnModuleInit, OnApplicationShutdown {
	private logger = new Logger(AppModule.name);
	constructor(private orm: MikroORM) {}

	async onModuleInit() {
		if (process.env.SKIP_MIGRATIONS === 'true') {
			this.logger.log('SKIP_MIGRATIONS=true, skipping migration check');
			return;
		}

		const migrator = this.orm.migrator;

		const executedMigrations = await migrator.getExecuted();
		this.logger.log('Executed migrations:', executedMigrations);

		const pendingMigrations = await migrator.getPending();
		this.logger.log('Pending migrations:', pendingMigrations);

		if (pendingMigrations.length > 0) {
			this.logger.log(`Running ${pendingMigrations.length} migrations`);
			await migrator.up({});
			this.logger.log('Migrations done');
		}
	}

	async onApplicationShutdown() {
		try {
			this.logger.log('Shutting down MikroORM');
			await this.orm.close();
			if (sdk) {
				this.logger.log('Shutting down OpenTelemetry SDK');
				await sdk.shutdown();
			}
		} catch (e) {
			this.logger.log(`Shut down threw error: ${(e as Error).message ?? '[no message]'}`);
		}
	}
}
