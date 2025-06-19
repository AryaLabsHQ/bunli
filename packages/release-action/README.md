# @bunli/release-action

> GitHub Action for automated multi-platform releases of Bunli CLIs

## Overview

The Bunli Release Action automates the release process for CLI applications built with Bunli. It handles multi-platform builds, changelog generation, GitHub releases, NPM publishing, and Homebrew formula updates.

## Features

- 🏗️ Multi-platform builds using Bun's `--compile` flag
- 📝 Automatic changelog generation from conventional commits
- 🚀 GitHub Release creation with artifacts and checksums
- 📦 NPM package publishing
- 🍺 Homebrew formula generation and updates
- ⚡ Zero-config with sensible defaults
- 🔧 Highly customizable via YAML configuration

## Quick Start

### Basic Usage

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: oven-sh/setup-bun@v2
      
      - uses: bunli/release-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### With NPM Publishing

```yaml
- uses: bunli/release-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    npm-token: ${{ secrets.NPM_TOKEN }}
```

## Configuration

Create a `.bunli-release.yaml` file in your repository:

```yaml
version: 1

project:
  name: my-cli
  description: My awesome CLI tool
  homepage: https://github.com/org/my-cli
  license: MIT

builds:
  - targets: all  # or ['darwin-arm64', 'linux-x64', ...]
    flags:
      minify: true
      sourcemap: false

changelog:
  groups:
    - title: 🚀 Features
      regexp: "^feat"
    - title: 🐛 Bug Fixes
      regexp: "^fix"

npm:
  publish: true
  access: public

homebrew:
  - repository:
      owner: my-org
      name: homebrew-tap
    name: my-cli
```

## Action Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `config` | Path to config file | `.bunli-release.yaml` |
| `github-token` | GitHub token for releases | `${{ github.token }}` |
| `npm-token` | NPM token for publishing | - |
| `homebrew-token` | GitHub token for Homebrew tap | - |
| `skip-build` | Skip building binaries | `false` |
| `working-directory` | Working directory | `.` |

## Action Outputs

| Output | Description |
|--------|-------------|
| `release-url` | URL of the created GitHub release |
| `release-id` | ID of the created GitHub release |
| `artifacts` | JSON array of uploaded artifacts |
| `changelog` | Generated changelog content |
| `version` | Version that was released |

## Development

This package is part of the Bunli monorepo. To work on it:

```bash
# Install dependencies
bun install

# Build the action
bun run build

# Run tests
bun test
```

## License

MIT