const path = require('path')

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'airbnb-base', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        endOfLine: 'auto'
      }
    ]
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      plugins: ['@typescript-eslint', 'node', 'import', 'prettier', 'simple-import-sort', 'unused-imports'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:node/recommended',
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:prettier/recommended'
      ],
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true
          }
        },
        node: {
          tryExtensions: ['.json', '.node', '.js', '.ts', '.d.ts']
        }
      },
      rules: {
        'prettier/prettier': [
          'error',
          {
            singleQuote: true,
            endOfLine: 'auto'
          }
        ],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/comma-dangle': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
        'node/no-missing-import': 'off',
        'import/prefer-default-export': 'off',
        'import/order': 'off',
        'class-methods-use-this': 'off', // 通常 Controller Class 内部不会使用 this
        'no-param-reassign': [
          'error',
          {
            props: true,
            ignorePropertyModificationsFor: ['target', 'descriptor', 'req', 'request', 'args'] // 装饰器中会修改 target, descriptor, 中间件会修改 req, prisma Extensions 会修改 args
          }
        ],
        '@typescript-eslint/no-useless-constructor': 'off'
      }
    }
  ]
}
