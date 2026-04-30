import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: ['node_modules', 'dist', 'build', 'coverage', '.git', '*.log', 'scripts/**/*.js'],
  },
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{js,ts,jsx,tsx}', 'configs/**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2026,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {

      /* ========== React Hooks ========== */
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],

      /* ========== 潜在错误 (Possible Errors) ========== */
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-void': 'error',
      'no-constant-condition': 'error',
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-extra-semi': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-implicit-coercion': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-iterator': 'error',
      'no-nested-ternary': 'error',
      'no-new-symbol': 'error',
      'no-obj-calls': 'error',
      'no-regex-spaces': 'error',
      'no-self-compare': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',

      /* ========== 最佳实践 (Best Practices) ========== */
      'eqeqeq': 'error',
      'curly': ['error', 'all'],
      'consistent-return': 'error',
      'no-return-assign': 'error',
      'no-param-reassign': 'error',
      'no-proto': 'error',
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-loop-func': 'error',
      'no-div-regex': 'error',
      'no-with': 'error',

      /* ========== 代码风格 (Code Style) ========== */
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': 'error',
      'dot-notation': 'error',
      'eol-last': 'error',
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'lines-between-class-members': 'error',
      'max-nested-callbacks': ['error', 3],
      'newline-per-chained-call': 'error',
      'no-array-constructor': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-spaced-func': 'error',
      'no-trailing-spaces': 'error',
      'object-shorthand': 'error',
      'operator-assignment': 'error',
      'operator-linebreak': 'error',
      'padded-blocks': ['error', 'never'],
      'quote-props': 'error',
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'semi-spacing': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': 'error',
      'space-infix-ops': 'error',
      'space-in-parens': 'error',
      'space-unary-ops': 'error',
      'spaced-comment': 'error',
      'wrap-iife': 'error',
      'wrap-regex': 'error',

      /* ========== 命名约定 (Naming Conventions) ========== */
      'camelcase': 'error',
      'new-cap': 'error',

      /* ========== 限制规则 (Limitation Rules) ========== */
      'max-depth': ['error', 4],
      'max-len': ['error', { code: 200, ignoreUrls: true, ignoreComments: false, ignoreStrings: true }],
      'max-params': ['error', 4],

      /* ========== 禁止模式 (禁止某些语法/操作) ========== */
      'no-caller': 'error',
      'no-cond-assign': 'error',
      'no-continue': 'error',
      'no-control-regex': 'error',
      'no-delete-var': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-inner-declarations': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-plusplus': 'error',
      'no-sequences': 'error',
      'no-this-before-super': 'error',
      'no-unused-labels': 'error',
      'no-use-before-define': 'error',
      'radix': 'error',
      'no-inline-comments': 'error',

      /* ========== 未使用导入 (Unused Imports) ========== */
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
