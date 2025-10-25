export const CONFIG_FILE_NAME = '{{name}}.config.js'

export const DEFAULT_CONFIG = {
  rules: {},
  server: {
    port: 3000,
    host: 'localhost',
    open: true
  },
  include: ['src/**/*.{js,ts}'],
  exclude: ['node_modules', 'dist']
}