import { FlatCompat } from '@eslint/eslintrc';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Adapt for ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a compatibility layer to transform your legacy config
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: {},
});

export default [
    // Add the converted configuration using compat
    ...compat.extends(
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier'
    ),

    {
        // Specify files this config applies to
        files: ['**/*.ts', '**/*.tsx'],

        // Configure plugins
        plugins: {
            'unused-imports': unusedImports,
            'simple-import-sort': simpleImportSort,
            // 'decorator-position': decoratorPosition,
            'import': importPlugin,
            'prettier': eslintPluginPrettier
        },

        settings: {
            'import/resolver': {
                typescript: {
                    project: path.resolve(__dirname, 'tsconfig.json'),
                    alwaysTryTypes: true
                }
            },
        },

        // Rules configuration
        rules: {
            '@typescript-eslint/indent': ['error', 4, {
                'ignoredNodes': ['Decorator']
            }],

            // Turn off the base TypeScript rule
            '@typescript-eslint/no-unused-vars': 'off',

            // Keep only the unused-imports rule with your desired configuration
            'unused-imports/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            'unused-imports/no-unused-imports': 'error',

            'simple-import-sort/imports': ['error', {
				groups: [
					["^\\u0000"],
					["^(@mikro-orm)(/.*|$)"],
					["^(@nestjs)(/.*|$)"],
					["^@?\\w"],
					["^(client|exceptions|email)(/.*|$)"],
					["^(src)(/.*|$)"],
					// Parent imports. Put `..` last.
					["^\\.\\.(?!/?$)", "^\\.\\./?$"],
					// Other relative imports. Put same-folder imports and `.` last.
					["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
				]
			}],

            'simple-import-sort/exports': 'error',
            // 'decorator-position/decorator-position': ['error'],
            'prettier/prettier': 'error',
            // TURNED OFF
            "@typescript-eslint/no-empty-object-type": "off",
            "import/no-named-as-default-member": "off",
            "import/no-named-as-default": "off",
            // Warnings
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    prettier
];
