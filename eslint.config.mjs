import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'node_modules/**'
        ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: [
            '**/*.{js,mjs,ts}'
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                document: 'readonly',
                process: 'readonly'
            }
        },
        rules: {
            semi: [
                'error',
                'never'
            ],
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ]
        }
    }
)
