import type { BunliReleaseConfig } from '../types.js'

export function getDefaults(): BunliReleaseConfig {
  return {
    version: 1,
    project: {
      name: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'unnamed-project'
    },
    builds: [{
      targets: 'all',
      flags: {
        minify: true,
        sourcemap: false
      },
      output: '{{.ProjectName}}-{{.Version}}-{{.OS}}-{{.Arch}}{{.Ext}}'
    }],
    archives: [{
      format: 'tar.gz',
      format_overrides: [{
        goos: 'windows',
        format: 'zip'
      }],
      files: [
        'LICENSE*',
        'README*',
        'CHANGELOG*'
      ]
    }],
    checksum: {
      name_template: 'checksums.txt',
      algorithm: 'sha256'
    },
    changelog: {
      use: 'git',
      sort: 'asc',
      groups: [
        {
          title: '🚀 Features',
          regexp: '^feat',
          order: 0
        },
        {
          title: '🐛 Bug Fixes',
          regexp: '^fix',
          order: 1
        },
        {
          title: '📚 Documentation',
          regexp: '^docs',
          order: 2
        },
        {
          title: '🔧 Maintenance',
          regexp: '^(chore|build|ci)',
          order: 3
        }
      ],
      filters: {
        exclude: [
          '^test:',
          '^wip:',
          '^Merge pull request',
          '^Merge branch'
        ]
      }
    },
    release: {
      prerelease: 'auto',
      draft: false,
      name_template: '{{.ProjectName}} v{{.Version}}'
    }
  }
}