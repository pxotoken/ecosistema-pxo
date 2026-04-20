import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export function createEslintConfig({ react = false } = {}) {
  const configs = [
    { ignores: ['dist'] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        globals: react ? globals.browser : globals.node,
      },
      plugins: react
        ? {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
          }
        : {},
      rules: react
        ? {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
              'warn',
              { allowConstantExport: true },
            ],
          }
        : {},
    },
  ];
  return tseslint.config(...configs);
}

export default createEslintConfig({ react: true });
