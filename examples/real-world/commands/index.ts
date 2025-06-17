// Real-world command manifest
export default {
  // Project management
  new: () => import('./project/new'),
  dev: () => import('./project/dev'),
  build: () => import('./project/build'),
  test: () => import('./project/test'),
  
  // Git helpers
  git: {
    branch: () => import('./git/branch'),
    pr: () => import('./git/pr'),
    sync: () => import('./git/sync')
  },
  
  // Docker utilities
  docker: {
    clean: () => import('./docker/clean'),
    stats: () => import('./docker/stats')
  },
  
  // Utilities
  env: () => import('./env'),
  clean: () => import('./clean'),
  update: () => import('./update')
}