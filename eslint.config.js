const tseslint = require('typescript-eslint');

module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'eslint.config.js',
      'scripts/**/*.cjs',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
    },
  },
];
