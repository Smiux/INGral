import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { 
    ignores: ['node_modules', 'dist', 'build', 'coverage', '.git', '*.log', 'scripts/**/*.js'] 
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{js,ts,jsx,tsx}', 'configs/**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks规则
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 禁用过于严格的TypeScript规则
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      // 基本规则
      'no-debugger': 'error',
    },
  }
);
