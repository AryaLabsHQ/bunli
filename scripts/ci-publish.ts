import { $ } from 'bun'
import { readdir, readFile, writeFile, mkdir, appendFile, mkdtemp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Result, TaggedError } from 'better-result'

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const tryAsync = <TValue, TError>(
  fn: () => Promise<TValue>,
  mapError: (cause: unknown) => TError
) =>
  Result.tryPromise(fn).then((result) =>
    result.mapError((error) => mapError(error.cause))
  )

const trySync = <TValue, TError>(
  fn: () => Awaited<TValue>,
  mapError: (cause: unknown) => TError
) =>
  Result.try(fn).mapError((error) => mapError(error.cause))

type PublishedPackage = { name: string; version: string }
type PublishablePackage = { dir: string; name: string; version: string }

const REGISTRY = 'https://registry.npmjs.org'

class MissingTokenError extends TaggedError('MissingTokenError')<{
  message: string
}>() {
  constructor() {
    super({ message: 'Missing NPM_TOKEN (or NODE_AUTH_TOKEN) in environment' })
  }
}

class IoError extends TaggedError('IoError')<{
  message: string
  step: string
  cause: unknown
}>() {
  constructor(step: string, cause: unknown) {
    super({
      message: `I/O error while ${step}: ${toErrorMessage(cause)}`,
      step,
      cause
    })
  }
}

class RegistryQueryError extends TaggedError('RegistryQueryError')<{
  message: string
  packageName: string
  version: string
  status: number
}>() {
  constructor(args: {
    packageName: string
    version: string
    status: number
    statusText: string
    body: string
  }) {
    const bodySuffix = args.body ? `\n${args.body}` : ''
    super({
      message:
        `Failed to query npm registry for ${args.packageName}@${args.version}: ` +
        `${args.status} ${args.statusText}${bodySuffix}`,
      packageName: args.packageName,
      version: args.version,
      status: args.status
    })
  }
}

class InvalidPackageManifestError extends TaggedError('InvalidPackageManifestError')<{
  message: string
  dir: string
}>() {
  constructor(dir: string) {
    super({
      message: `Invalid package.json in ${dir}: missing name or version`,
      dir
    })
  }
}

class PackArchiveError extends TaggedError('PackArchiveError')<{
  message: string
  packDir: string
}>() {
  constructor(packDir: string, found: number) {
    super({
      message: `Expected exactly one .tgz in ${packDir}, found ${found}`,
      packDir
    })
  }
}

class CommandError extends TaggedError('CommandError')<{
  message: string
  command: string
  cause: unknown
}>() {
  constructor(command: string, cause: unknown) {
    super({
      message: `Command failed (${command}): ${toErrorMessage(cause)}`,
      command,
      cause
    })
  }
}

type PublishError =
  | MissingTokenError
  | IoError
  | RegistryQueryError
  | InvalidPackageManifestError
  | PackArchiveError
  | CommandError

async function ensureNpmAuth(): Promise<Result<void, PublishError>> {
  const token = process.env.NPM_TOKEN || process.env.NODE_AUTH_TOKEN
  if (!token) {
    return Result.err(new MissingTokenError())
  }

  process.env.NODE_AUTH_TOKEN = token
  process.env.BUN_AUTH_TOKEN = token

  const userConfigPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'bunli-npmrc')
  const line = `//registry.npmjs.org/:_authToken=${token}\n`

  const writeUserConfigResult = await tryAsync(
    () => writeFile(userConfigPath, line, 'utf8'),
    (cause) => new IoError(`writing ${userConfigPath}`, cause)
  )
  if (Result.isError(writeUserConfigResult)) {
    return writeUserConfigResult
  }

  process.env.NPM_CONFIG_USERCONFIG = userConfigPath
  process.env.npm_config_userconfig = userConfigPath

  const npmrcPath = path.join(os.homedir(), '.npmrc')

  if (existsSync(npmrcPath)) {
    const existingResult = await tryAsync(
      () => readFile(npmrcPath, 'utf8'),
      (cause) => new IoError(`reading ${npmrcPath}`, cause)
    )
    if (Result.isError(existingResult)) {
      return existingResult
    }

    if (existingResult.value.includes('_authToken=')) {
      return Result.ok(undefined)
    }

    const appendResult = await tryAsync(
      () => appendFile(npmrcPath, line),
      (cause) => new IoError(`updating ${npmrcPath}`, cause)
    )

    if (Result.isError(appendResult)) {
      return appendResult
    }

    return Result.ok(undefined)
  }

  const writeHomeConfigResult = await tryAsync(
    () => writeFile(npmrcPath, line, 'utf8'),
    (cause) => new IoError(`writing ${npmrcPath}`, cause)
  )

  if (Result.isError(writeHomeConfigResult)) {
    return writeHomeConfigResult
  }

  return Result.ok(undefined)
}

async function versionExistsOnNpm(name: string, version: string): Promise<Result<boolean, PublishError>> {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`

  const fetchResult = await tryAsync(
    () => fetch(url),
    (cause) => new RegistryQueryError({
      packageName: name,
      version,
      status: 0,
      statusText: 'fetch failed',
      body: toErrorMessage(cause)
    })
  )

  if (Result.isError(fetchResult)) {
    return fetchResult
  }

  const response = fetchResult.value
  if (response.status === 404) return Result.ok(false)
  if (response.ok) return Result.ok(true)

  const bodyResult = await tryAsync<string, string>(
    () => response.text(),
    (cause) => `failed to read response body: ${toErrorMessage(cause)}`
  )

  const body = Result.isOk(bodyResult)
    ? bodyResult.value
    : `[${bodyResult.error}]`
  return Result.err(
    new RegistryQueryError({
      packageName: name,
      version,
      status: response.status,
      statusText: response.statusText,
      body
    })
  )
}

async function readJson(filePath: string): Promise<Result<unknown, PublishError>> {
  const textResult = await tryAsync(
    () => readFile(filePath, 'utf8'),
    (cause) => new IoError(`reading ${filePath}`, cause)
  )
  if (Result.isError(textResult)) {
    return textResult
  }

  return trySync(
    () => JSON.parse(textResult.value),
    (cause) => new IoError(`parsing JSON in ${filePath}: ${toErrorMessage(cause)}`, cause)
  )
}

async function listPublishablePackages(): Promise<Result<PublishablePackage[], PublishError>> {
  const packagesRoot = path.join(process.cwd(), 'packages')

  const entriesResult = await tryAsync(
    () => readdir(packagesRoot, { withFileTypes: true }),
    (cause) => new IoError(`listing ${packagesRoot}`, cause)
  )
  if (Result.isError(entriesResult)) {
    return entriesResult
  }

  const pkgs: PublishablePackage[] = []

  for (const ent of entriesResult.value) {
    if (!ent.isDirectory()) continue

    const dir = path.join(packagesRoot, ent.name)
    const pkgPath = path.join(dir, 'package.json')
    if (!existsSync(pkgPath)) continue

    const pkgResult = await readJson(pkgPath)
    if (Result.isError(pkgResult)) {
      return pkgResult
    }

    const pkg = pkgResult.value as { private?: boolean; name?: string; version?: string }
    if (pkg.private) continue

    const name = String(pkg.name || '')
    const version = String(pkg.version || '')
    if (!name || !version) {
      return Result.err(new InvalidPackageManifestError(dir))
    }

    pkgs.push({ dir, name, version })
  }

  pkgs.sort((a, b) => a.name.localeCompare(b.name))
  return Result.ok(pkgs)
}

async function publishPackage(dir: string): Promise<Result<void, PublishError>> {
  const packDirResult = await tryAsync(
    () => mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'bunli-pack-')),
    (cause) => new IoError('creating temporary pack directory', cause)
  )

  if (Result.isError(packDirResult)) {
    return packDirResult
  }

  const packDir = packDirResult.value

  const packCmd = await $`bun pm pack --cwd ${dir} --destination ${packDir} --ignore-scripts`.nothrow()
  if (packCmd.exitCode !== 0) {
    return Result.err(new CommandError(`bun pm pack --cwd ${dir}`, packCmd.stderr.toString()))
  }

  const packedFilesResult = await tryAsync(
    () => readdir(packDir),
    (cause) => new IoError(`reading ${packDir}`, cause)
  )

  if (Result.isError(packedFilesResult)) {
    return packedFilesResult
  }

  const packed = packedFilesResult.value.filter((file) => file.endsWith('.tgz'))
  if (packed.length !== 1) {
    return Result.err(new PackArchiveError(packDir, packed.length))
  }

  const tgzPath = path.join(packDir, packed[0]!)
  const publishCmd = await $`npm publish ${tgzPath} --access public --tag latest`.nothrow()

  if (publishCmd.exitCode !== 0) {
    return Result.err(new CommandError(`npm publish ${tgzPath}`, publishCmd.stderr.toString()))
  }

  return Result.ok(undefined)
}

async function writePublishedFile(published: PublishedPackage[]): Promise<Result<void, PublishError>> {
  const outDir = path.join(process.cwd(), '.changeset')
  const mkdirResult = await tryAsync(
    () => mkdir(outDir, { recursive: true }),
    (cause) => new IoError(`creating ${outDir}`, cause)
  )
  if (Result.isError(mkdirResult)) {
    return mkdirResult
  }

  const outPath = path.join(outDir, 'published-packages.json')
  const writeResult = await tryAsync(
    () => writeFile(outPath, JSON.stringify(published, null, 2) + '\n', 'utf8'),
    (cause) => new IoError(`writing ${outPath}`, cause)
  )

  if (Result.isError(writeResult)) {
    return writeResult
  }

  return Result.ok(undefined)
}

async function main(): Promise<Result<void, PublishError>> {
  const authResult = await ensureNpmAuth()
  if (Result.isError(authResult)) {
    return authResult
  }

  const packageResult = await listPublishablePackages()
  if (Result.isError(packageResult)) {
    return packageResult
  }

  const published: PublishedPackage[] = []

  for (const pkg of packageResult.value) {
    const existsResult = await versionExistsOnNpm(pkg.name, pkg.version)
    if (Result.isError(existsResult)) {
      return existsResult
    }

    if (existsResult.value) {
      console.log(`skip ${pkg.name}@${pkg.version} (already on npm)`)
      continue
    }

    console.log(`publish ${pkg.name}@${pkg.version}`)
    const publishResult = await publishPackage(pkg.dir)
    if (Result.isError(publishResult)) {
      return publishResult
    }

    published.push({ name: pkg.name, version: pkg.version })
  }

  const writeResult = await writePublishedFile(published)
  if (Result.isError(writeResult)) {
    return writeResult
  }

  if (published.length === 0) {
    console.log('No packages published.')
    return Result.ok(undefined)
  }

  const tagResult = await $`bunx changeset tag`.nothrow()
  if (tagResult.exitCode !== 0) {
    return Result.err(new CommandError('bunx changeset tag', tagResult.stderr.toString()))
  }

  if (process.env.CI) {
    const pushTagResult = await $`git push origin --tags`.nothrow()
    if (pushTagResult.exitCode !== 0) {
      return Result.err(new CommandError('git push origin --tags', pushTagResult.stderr.toString()))
    }
  } else {
    console.log('Skipping tag push because CI is not set.')
  }

  return Result.ok(undefined)
}

const result = await main()
if (Result.isError(result)) {
  console.error(result.error.message)
  process.exit(1)
}
