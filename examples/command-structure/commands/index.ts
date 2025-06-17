// Command manifest for lazy loading
export default {
  // Top-level commands
  init: () => import('./init'),
  deploy: () => import('./deploy'),
  config: () => import('./config'),
  
  // Nested commands
  db: {
    migrate: () => import('./db/migrate'),
    seed: () => import('./db/seed'),
    backup: () => import('./db/backup')
  },
  
  // Aliases are defined in the command files themselves
}