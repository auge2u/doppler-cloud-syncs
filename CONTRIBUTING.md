# Contributing to DCS

Thank you for your interest in contributing to the Doppler Cloud Syncs project!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/auge2u/doppler-cloud-syncs.git
   cd doppler-cloud-syncs
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build all packages**
   ```bash
   pnpm build
   ```

4. **Run tests**
   ```bash
   pnpm test
   ```

## Project Structure

```
packages/
  cli/          # @auge2u/dcs - CLI tool
  runtime/      # @auge2u/dcs-runtime - Runtime adapters
  dotfiles/     # @auge2u/dcs-dotfiles - Shell integrations
```

## Making Changes

### Creating a Changeset

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

When you make a change that affects users of any package, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages are affected
2. Choose the semver bump type (patch, minor, major)
3. Write a summary of the changes

The changeset file will be created in `.changeset/`. Commit this file with your PR.

### Changeset Guidelines

- **patch**: Bug fixes, documentation updates, internal changes
- **minor**: New features that are backwards compatible
- **major**: Breaking changes

Example changeset summaries:
- `fix(cli): resolve sync timeout on large secrets`
- `feat(runtime): add Cloudflare Durable Objects support`
- `breaking(cli): require Node.js 20+`

### When NOT to create a changeset

- Changes to tests only
- Changes to CI/CD workflows
- Updates to documentation that doesn't affect the packages
- Internal refactoring with no user-facing impact

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add a changeset if needed
4. Ensure tests pass: `pnpm test`
5. Ensure linting passes: `pnpm lint`
6. Submit a PR to `main`

## Release Process

Releases are automated via GitHub Actions:

1. Changesets accumulate in the `.changeset/` directory
2. When ready to release, maintainers run `pnpm changeset version`
3. This updates package versions and generates CHANGELOG entries
4. A version tag is created and pushed
5. GitHub Actions publishes to npm and creates a GitHub Release

## Code Style

- TypeScript with strict mode
- ESM modules (no CommonJS)
- Use `vitest` for testing
- Follow existing patterns in the codebase

## Questions?

Open an issue or start a discussion on GitHub.
