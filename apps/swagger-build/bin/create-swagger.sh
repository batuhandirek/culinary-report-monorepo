#!/usr/bin/env bash
#
# Generate swagger.json by cloning apps/backend/src into this CJS-scoped
# sibling package and running `nestia swagger` from here.
#
# Why: nestia 11 uses ts-node's CJS hook to load controllers, which is
# incompatible with apps/backend's ESM scope (`"type": "module"`). The
# clone runs in a CJS package, and the sed pass strips the ESM-only
# markers (`import.meta.*`, `.js` extensions in relative imports) that
# would otherwise trip Node's loader.
#
# This package is placed as a sibling of apps/backend so that source files
# walking `__dirname` upward (e.g. to find `env/server/.env.local`) land
# at the same monorepo paths they would from the real backend.

set -euo pipefail

BUILD_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$(cd "$BUILD_DIR/../backend" && pwd)"

echo "[create-swagger] syncing $BACKEND_DIR/src → $BUILD_DIR/src"
rsync -a --delete \
	--exclude='*.spec.ts' \
	--exclude='*.test.ts' \
	"$BACKEND_DIR/src/" "$BUILD_DIR/src/"

echo "[create-swagger] rewriting ESM-only constructs to CJS equivalents"
# - `import.meta.dirname`  → `__dirname`
# - `import.meta.filename` → `__filename`
# - `import.meta.url`      → `require('url').pathToFileURL(__filename).href`
# - `from './x.js'` / `from 'src/x.js'` → strip the `.js` so CJS resolution
#   finds the `.ts` source.
find "$BUILD_DIR/src" -type f -name '*.ts' -print0 |
	xargs -0 perl -i -pe '
		s/\bimport\.meta\.dirname\b/__dirname/g;
		s/\bimport\.meta\.filename\b/__filename/g;
		s/\bimport\.meta\.url\b/require("url").pathToFileURL(__filename).href/g;
		s{(from\s+['\''"]|import\(['\''"])(\.{1,2}/[^'\''"]*|src/[^'\''"]*)\.js(['\''"])}{$1$2$3}g;
	'

echo "[create-swagger] linking node_modules"
# All deps are hoisted to the monorepo root; symlink there so Node's
# resolver finds @mikro-orm/* etc. Relative target keeps the clone
# portable across machines.
if [ -L "$BUILD_DIR/node_modules" ]; then
	rm "$BUILD_DIR/node_modules"
elif [ -e "$BUILD_DIR/node_modules" ]; then
	echo "error: $BUILD_DIR/node_modules exists and is not a symlink; refusing to delete" >&2
	exit 1
fi
ln -s ../../node_modules "$BUILD_DIR/node_modules"

echo "[create-swagger] running nestia swagger"
(
	cd "$BUILD_DIR"
	# Keep type-check on so nestia's transformers have a real type
	# checker, but route diagnostics through TS_NODE_LOG_ERROR so noisy
	# MikroORM v7 / Zod typing mismatches don't halt the build.
	NODE_ENV=development NODE_OPTIONS='--max-old-space-size=8192' \
		TS_NODE_LOG_ERROR=true \
		npx nestia swagger
)

echo "[create-swagger] done."
