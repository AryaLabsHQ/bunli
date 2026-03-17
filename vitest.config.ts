import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: [],
    typecheck: {
      enabled: true,
      include: ['packages/*/test/**/*.test-d.ts'],
      tsconfig: './tsconfig.typetest.json',
    },
  },
})
