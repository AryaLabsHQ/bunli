export interface BunliReleaseConfig {
  version: number
  project: ProjectConfig
  builds?: BuildConfig[]
  archives?: ArchiveConfig[]
  checksum?: ChecksumConfig
  changelog?: ChangelogConfig
  npm?: NPMConfig
  homebrew?: HomebrewConfig[]
  release?: ReleaseConfig
}

export interface ProjectConfig {
  name: string
  description?: string
  homepage?: string
  license?: string
}

export interface BuildConfig {
  targets?: string[] | 'all' | 'native'
  flags?: {
    minify?: boolean
    sourcemap?: boolean
    define?: Record<string, string>
  }
  entry?: string
  output?: string
  env?: string[]
  ldflags?: string[]
}

export interface ArchiveConfig {
  format?: 'tar.gz' | 'zip'
  name_template?: string
  format_overrides?: {
    goos: string
    format: 'tar.gz' | 'zip'
  }[]
  files?: string[]
  wrap_in_directory?: boolean
}

export interface ChecksumConfig {
  name_template?: string
  algorithm?: 'sha256' | 'sha512' | 'md5'
}

export interface ChangelogConfig {
  use?: 'git' | 'github'
  sort?: 'asc' | 'desc'
  groups?: {
    title: string
    regexp: string
    order?: number
  }[]
  filters?: {
    exclude?: string[]
    include?: string[]
  }
}

export interface NPMConfig {
  publish?: boolean
  registry?: string
  access?: 'public' | 'restricted'
  tag?: string
  files?: string[]
}

export interface HomebrewConfig {
  repository: {
    owner: string
    name: string
    branch?: string
  }
  name?: string
  homepage?: string
  description?: string
  license?: string
  dependencies?: {
    name: string
    type?: 'build' | 'optional' | 'recommended' | 'run'
  }[]
  install?: string
  test?: string
  caveats?: string
  commit_msg_template?: string
  commit_author?: {
    name?: string
    email?: string
  }
}

export interface ReleaseConfig {
  github?: {
    owner?: string
    name?: string
  }
  name_template?: string
  prerelease?: boolean | 'auto'
  draft?: boolean
  header?: string
  footer?: string
  disable?: boolean
}

export interface BuildArtifact {
  path: string
  name: string
  platform: string
  arch: string
  checksum?: string
  size?: number
}

export interface ReleaseContext {
  version: string
  tag: string
  commit: string
  date: string
  previousTag?: string
  artifacts: BuildArtifact[]
  changelog: string
  projectName: string
  env: Record<string, string>
}

export interface TemplateContext {
  ProjectName: string
  ProjectDescription?: string
  ProjectHomepage?: string
  ProjectLicense?: string
  Version: string
  Tag: string
  PreviousTag?: string
  Date: string
  Commit: string
  OS?: string
  Arch?: string
  Ext?: string
  Binary?: string
  ReleaseURL?: string
  Env: Record<string, string>
}

export const SUPPORTED_PLATFORMS = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'windows-x64'
] as const

export type Platform = typeof SUPPORTED_PLATFORMS[number]

export function parsePlatform(platform: string): { os: string; arch: string } {
  const [os, arch] = platform.split('-')
  if (!os || !arch) {
    throw new Error(`Invalid platform format: ${platform}`)
  }
  return { os, arch }
}

export function getFileExtension(os: string): string {
  return os === 'windows' ? '.exe' : ''
}