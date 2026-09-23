// eslint.config.js
// Configuración para análisis estático de seguridad — Fase 4A.2
// Corrección mínima aplicada: "type": "module" en package.json para resolver
// la inconsistencia CommonJS/ES Modules entre módulos del backend
// Extendido para cubrir frontend/src (Fase 4A, análisis sobre el conjunto completo backend+frontend)

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
