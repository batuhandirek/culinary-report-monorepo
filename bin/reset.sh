#!/usr/bin/env bash
# Replaces the local dev database with the newest dump in backups/ (see download-latest-backup.ts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups"
CONTAINER="culinary-report-dev-db"
DB_NAME="$(grep -E '^DB_NAME=' "$ROOT/env/server/.env.local" 2>/dev/null | cut -d= -f2- || true)"
DB_NAME="${DB_NAME:-munchwerk}"

# Pick newest regular file, ignoring .DS_Store
BACKUP_FILE="$(find "$BACKUP_DIR" -maxdepth 1 -type f ! -name '.DS_Store' -print0 \
	| xargs -0 stat -f '%m %N' \
	| sort -nr | head -n1 | cut -d' ' -f2-)"

if [[ -z "${BACKUP_FILE:-}" ]]; then
	echo "No backup file found in $BACKUP_DIR" >&2
	exit 1
fi

echo "Using backup: $BACKUP_FILE -> $DB_NAME"

# Admin commands connect to template1: DB_NAME may itself be "postgres", which can't be
# dropped from inside.
# 1. Restore into a side database nothing connects to, so a running backend (its job queue
#    polls constantly) can't write into a half-restored one. Swapped in at the end.
TARGET="${DB_NAME}_restore"
docker exec -i "$CONTAINER" psql -U postgres -d template1 -c "DROP DATABASE IF EXISTS \"$TARGET\";" -c "CREATE DATABASE \"$TARGET\" TEMPLATE template0;"

read_dump() {
	case "$BACKUP_FILE" in
		*.gz) gunzip -c "$BACKUP_FILE" ;;
		*)    cat "$BACKUP_FILE" ;;
	esac
}

# Index builds run without parallel workers: a parallel build keeps its working memory in /dev/shm,
# which Docker caps at 64 MB, and the HNSW index on statements.embedding outgrew it ("could not
# resize shared memory segment"). A serial build uses the server's own memory instead.
RESTORE_PGOPTIONS='-c max_parallel_maintenance_workers=0 -c maintenance_work_mem=512MB'

# 2. Restore into $TARGET.
#    Coolify's backup is a pg_dumpall: roles (it would set the local postgres password to the
#    remote one), then template1, then the app's tables in the "postgres" database. Only that
#    last section is applied, aimed at $TARGET. A plain pg_dump goes in whole.
#    A custom-format dump (.dmp) goes through pg_restore.
case "$BACKUP_FILE" in
	*.dmp)
		docker exec -i -e PGOPTIONS="$RESTORE_PGOPTIONS" "$CONTAINER" pg_restore -U postgres -d "$TARGET" --no-owner < "$BACKUP_FILE"
		;;
	*)
		if read_dump | grep -cx '\\connect postgres' >/dev/null; then
			read_dump | awk -v db="$TARGET" '
				/^\\connect / { on = ($0 == "\\connect postgres"); if (on) print "\\connect \"" db "\""; next }
				on' | docker exec -i -e PGOPTIONS="$RESTORE_PGOPTIONS" "$CONTAINER" psql -U postgres -d "$TARGET" -q -v ON_ERROR_STOP=1
		else
			read_dump | docker exec -i -e PGOPTIONS="$RESTORE_PGOPTIONS" "$CONTAINER" psql -U postgres -d "$TARGET" -q -v ON_ERROR_STOP=1
		fi
		;;
esac

# 3. Swap: drop the old database (FORCE ends its connections) and rename the restored one.
docker exec -i "$CONTAINER" psql -U postgres -d template1 \
	-c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE);" \
	-c "ALTER DATABASE \"$TARGET\" RENAME TO \"$DB_NAME\";"
echo "Restored $BACKUP_FILE into $DB_NAME"
