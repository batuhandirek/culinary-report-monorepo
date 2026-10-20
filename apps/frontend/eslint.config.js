import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { loadConfig } from '@sveltejs/load-config';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import svelteParser from 'svelte-eslint-parser';
import ts from 'typescript-eslint';

const loaded = await loadConfig('./', { traverse: false });
const svelteConfig = loaded && 'config' in loaded ? loaded.config : undefined;

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		plugins: {
			prettier: prettierPlugin,
			'simple-import-sort': simpleImportSortPlugin,
			import: importPlugin
		},
		rules: {
			// TS
			'no-undef': 'off',

			// import sorting
			'simple-import-sort/imports': [
				'error',
				{
					groups: [
						['^\\u0000'],
						['^(@mikro-orm)(/.*|$)'],
						['^(@nestjs)(/.*|$)'],
						['^@?\\w'],
						['^(svelte)(/.*|$)'],
						['^(client|exceptions|email)(/.*|$)'],
						['^(src)(/.*|$)'],
						// Parent imports. Put `..` last.
						['^\\.\\.(?!/?$)', '^\\.\\./?$'],
						// Other relative imports. Put same-folder imports and `.` last.
						['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
						// SvelteKit modules (`$app/...`), then our `#` subpath imports
						['^\\$', '^#']
					]
				}
			],
			'simple-import-sort/exports': 'error',
			'import/first': 'error',
			'import/newline-after-import': 'error',
			'import/no-duplicates': 'error',

			// run Prettier
			'prettier/prettier': 'error',

			// CLOSED,
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/no-useless-children-snippet': 'off',
			'no-empty': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			'svelte/attribute-quotes': 'off'
		}
	},
	{
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: ts.parser,
			parserOptions: {
				project: './tsconfig.json',
				sourceType: 'module'
			}
		}
	}
);
