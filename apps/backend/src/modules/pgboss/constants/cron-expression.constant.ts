/**
 * Common cron expressions for `@OnCron`. pg-boss uses standard 5-field cron
 * (minute granularity — no seconds field.
 */
export const CronExpression = {
	EVERY_MINUTE: '* * * * *',
	EVERY_5_MINUTES: '*/5 * * * *',
	EVERY_10_MINUTES: '*/10 * * * *',
	EVERY_HOUR: '0 * * * *',
	EVERY_3_HOURS: '0 */3 * * *',
	EVERY_DAY_AT_11AM: '0 11 * * *',
	EVERY_DAY_AT_9PM: '0 21 * * *',
} as const;
