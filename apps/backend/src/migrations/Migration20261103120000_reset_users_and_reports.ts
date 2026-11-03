import { Migration } from '@mikro-orm/migrations';

// Hand-written, one-off, for the first deployment: every account made while building (test and
// integration users), every report and report link, and the blog (articles and tags) go, and one
// admin account is created. Deleting users cascades their sessions, notifications, notification
// preferences, verification requests and brand memberships; outreach touches keep their row with
// the report and link nulled.
//
// The password is "12345678", stored as bcrypt with cost 10 like `PasswordService.hashPassword`.
// Change it after the first login.

const ADMIN_ID = '7b1f6a0e-3c1d-4e8a-9f2b-5d6c7e8f9a01';
const ADMIN_EMAIL = 'batu@munchwerk.com';
const ADMIN_PASSWORD_HASH = '$2b$10$B2Eq02/HVK7IEm04uJ0emudLwDIXsUJrvEFybrfcrqjUPUXqp8meW';

export class Migration20261103120000_reset_users_and_reports extends Migration {
	override up(): void | Promise<void> {
		this.addSql(`delete from "report_shares";`);
		this.addSql(`delete from "reports";`);

		this.addSql(`
			insert into "users" ("id", "first_name", "last_name", "email", "email_verified_at",
				"hashed_password", "password_last_changed_at", "roles")
			values ('${ADMIN_ID}', 'Batu', 'Direk', '${ADMIN_EMAIL}', now(),
				'${ADMIN_PASSWORD_HASH}', now(), '{user,admin}');
		`);
		this.addSql(`delete from "blog_entries";`);
		this.addSql(`delete from "blog_tags";`);
		this.addSql(`delete from "users" where "id" <> '${ADMIN_ID}';`);
	}

	override down(): void | Promise<void> {
		// The deleted accounts and reports are gone; nothing to restore.
	}
}
