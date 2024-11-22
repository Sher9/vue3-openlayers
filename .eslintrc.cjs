/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/no-unused-components': 'warn',
    'no-unused-vars': 'warn',
    'vue/script-setup-uses-vars': 'error',
    'vue/no-mutating-props': 'warn',
    'vue/attribute-hyphenation': 'warn',
    'vue/v-on-event-hyphenation': 'warn',
    'vue/no-template-shadow': 'warn',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/html-closing-bracket-newline': [
      'error',
      {
        'singleline': 'never',
        'multiline': 'always'
      }
    ],
    'vue/html-indent': ['error', 2],
    'vue/max-attributes-per-line': [
      'error',
      {
        'singleline': 3,
        'multiline': 1
      }
    ]
  }
} 