// Configuración de ESLint para el análisis estático (backend y frontend).

import pluginSecurity from 'eslint-plugin-security';
import pluginN from 'eslint-plugin-n';

export default [
  {
    files: ['src/**/*.js'],
    plugins: {
      security: pluginSecurity,
      n: pluginN,
    },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
      'n/no-process-exit': 'warn',
      'n/no-sync': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['frontend/src/**/*.jsx', 'frontend/src/**/*.js'],
    plugins: {
      security: pluginSecurity,
    },
    rules: {
      ...pluginSecurity.configs.recommended.rules,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
      },
    },
  },
];
