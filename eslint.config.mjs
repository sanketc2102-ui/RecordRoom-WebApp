import js from '@eslint/js'
import globals from 'globals'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  { ignores: ['**/node_modules', '**/dist'] },
  js.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: { react: { version: 'detect' } }
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } },
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      'react/prop-types': 'off' // this project doesn't use PropTypes
    }
  },
  {
    files: ['*.config.{js,mjs}'],
    languageOptions: { globals: globals.node }
  },
  eslintConfigPrettier
]
