#!/usr/bin/env bash
# On-demand integration (user-journey) tests. Two ways to run them:
#
#   npm run backend:test:integration [-- <suite>]
#     clones the dev DB, boots a real server against the clone, runs the suites there.
#
#   INTEGRATION_BASE_URL=http://localhost:3015/api npm run backend:test:integration [-- <suite>]
#     runs the suites against a backend already running, so what they do lands in its
#     database. That server must use the same VERIFICATION_DEFAULT_CODE.
#
#   npm run backend:test:integration:local [-- <suite>]
#     the same, against your dev server: its PORT and VERIFICATION_DEFAULT_CODE come from
#     env/server/.env.local (a value already exported in the shell wins).
#
# Suites log in as an admin with INTEGRATION_ADMIN_EMAIL / INTEGRATION_ADMIN_PASSWORD, an
# admin account on the target (in the clone, any admin of the dev DB): to act as one, and to
# find the accounts they reuse run after run. Both come from env/server/.env.local in every
# mode, a value already exported in the shell winning.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
ENV_FILE="$ROOT_DIR/env/server/.env.local"

VERIFICATION_DEFAULT_CODE="${VERIFICATION_DEFAULT_CODE:-111111}"

# One variable as the dev server sees it: the shell's value, else the env file's.
env_value() {
	node --env-file="$ENV_FILE" -e 'process.stdout.write(process.env[process.argv[1]] ?? "")' "$1"
}

INTEGRATION_ADMIN_EMAIL="$(env_value INTEGRATION_ADMIN_EMAIL)"
INTEGRATION_ADMIN_PASSWORD="$(env_value INTEGRATION_ADMIN_PASSWORD)"
export INTEGRATION_ADMIN_EMAIL INTEGRATION_ADMIN_PASSWORD

if [ "${1:-}" = "--local" ]; then
	shift
	INTEGRATION_BASE_URL="http://localhost:$(env_value PORT)/api"
	VERIFICATION_DEFAULT_CODE="$(env_value VERIFICATION_DEFAULT_CODE)"
	if [ -z "$VERIFICATION_DEFAULT_CODE" ]; then
		echo "Set VERIFICATION_DEFAULT_CODE in env/server/.env.local and restart dev: the" >&2
		echo "journeys sign users up and need to know the code the server sends." >&2
		exit 1
	fi
	if ! curl -sf "${INTEGRATION_BASE_URL}/health-check" >/dev/null 2>&1; then
		echo "No dev server answering at ${INTEGRATION_BASE_URL}: start it with npm run start:dev" >&2
		exit 1
	fi
fi

run_suites() {
	(
		cd "$BACKEND_DIR" &&
			INTEGRATION_BASE_URL="$1" \
				VERIFICATION_DEFAULT_CODE="$VERIFICATION_DEFAULT_CODE" \
				npm run test:integration -- "${@:2}"
	)
}

if [ -n "${INTEGRATION_BASE_URL:-}" ]; then
	echo "==> Running integration suites against ${INTEGRATION_BASE_URL}"
	run_suites "$INTEGRATION_BASE_URL" "$@"
	exit 0
fi

INTEGRATION_PORT="${INTEGRATION_PORT:-3010}"
INTEGRATION_DB_NAME="${INTEGRATION_DB_NAME:-culinary_report_integration}"
HEALTH_URL="http://localhost:${INTEGRATION_PORT}/api/health-check"

echo "==> Cloning dev database into ${INTEGRATION_DB_NAME}"
node --env-file="$ROOT_DIR/env/server/.env.local" "$ROOT_DIR/bin/clone-integration-db.ts"

echo "==> Building backend (clean: nest build leaves deleted files behind, and a stale
    migration in dist still runs against the clone)"
rm -rf "$BACKEND_DIR/dist"
(cd "$BACKEND_DIR" && npm run build)

echo "==> Starting server on port ${INTEGRATION_PORT} against ${INTEGRATION_DB_NAME}"
SERVER_LOG="$ROOT_DIR/apps/backend/integration-server.log"
NODE_ENV=development \
	PORT="$INTEGRATION_PORT" \
	DB_NAME="$INTEGRATION_DB_NAME" \
	EMAIL_IS_DISABLED=true \
	SMS_IS_DISABLED=true \
	PUSH_IS_DISABLED=true \
	OTP_IS_DISABLED=true \
	TELEGRAM_IS_DISABLED=true \
	VERIFICATION_DEFAULT_CODE="$VERIFICATION_DEFAULT_CODE" \
	node "$BACKEND_DIR/dist/main.js" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

cleanup() {
	if kill -0 "$SERVER_PID" 2>/dev/null; then
		echo "==> Stopping server (pid ${SERVER_PID})"
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
}
trap cleanup EXIT

echo "==> Waiting for ${HEALTH_URL} (server log: ${SERVER_LOG})"
for i in $(seq 1 120); do
	if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
		echo "==> Server is up"
		break
	fi
	if ! kill -0 "$SERVER_PID" 2>/dev/null; then
		echo "Server process died during boot — last log lines:" >&2
		tail -n 40 "$SERVER_LOG" >&2
		exit 1
	fi
	if [ "$i" -eq 120 ]; then
		echo "Server did not become healthy in time — last log lines:" >&2
		tail -n 40 "$SERVER_LOG" >&2
		exit 1
	fi
	sleep 1
done

echo "==> Running integration suites"
run_suites "http://localhost:${INTEGRATION_PORT}/api" "$@"
