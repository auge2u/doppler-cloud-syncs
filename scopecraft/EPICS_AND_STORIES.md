# Epics and Stories

## Epic 1: Test Coverage

**Goal:** Achieve >80% test coverage on CLI package and >70% on runtime package.

### Story 1.1: Config Module Tests

**As a** developer
**I want** comprehensive tests for the config module
**So that** config loading is reliable and edge cases are handled

#### Acceptance Criteria

- [ ] Test valid dcs.yaml parsing
- [ ] Test environment variable interpolation
- [ ] Test missing config file error
- [ ] Test invalid YAML error
- [ ] Test schema validation failures
- [ ] Test findConfigFile traversal

#### Technical Notes

- Use vitest with temp directory fixtures
- Mock `process.env` for interpolation tests

---

### Story 1.2: Platform Adapter Tests

**As a** developer
**I want** tests for all platform adapters
**So that** external CLI interactions are verified

#### Acceptance Criteria

- [ ] DopplerClient: getSecrets, setSecret, setSecrets, listConfigs, diff
- [ ] FirebaseClient: getConfig, setConfig, syncFromDoppler, diff
- [ ] CloudflareClient: listSecrets, syncFromDoppler, deleteSecret, diff
- [ ] NeonClient: all branch and migration operations
- [ ] All tests use mocked execFileSync

#### Technical Notes

- Mock child_process.execFileSync
- Test both success and error paths
- Verify correct CLI arguments are passed

---

### Story 1.3: Command Tests

**As a** developer
**I want** tests for CLI commands
**So that** command behavior is consistent

#### Acceptance Criteria

- [ ] Test init creates correct config file
- [ ] Test sync calls correct platform methods
- [ ] Test status displays platform states
- [ ] Test diff shows correct changes
- [ ] Test run spawns process with secrets
- [ ] Test neon subcommands
- [ ] Test hooks subcommands
- [ ] Test webhook subcommands

#### Technical Notes

- Mock platform clients entirely
- Test option parsing
- Verify console output

---

### Story 1.4: Runtime Adapter Tests

**As a** developer
**I want** tests for runtime adapters
**So that** serverless secret injection works correctly

#### Acceptance Criteria

- [ ] Firebase adapter: withSecrets wrapper
- [ ] Cloudflare adapter: withSecrets wrapper
- [ ] Cloud Run adapter: initSecrets, getSecret
- [ ] Cache module: TTL, refresh behavior
- [ ] Fetcher module: Doppler API mocking

#### Technical Notes

- Mock Doppler API responses
- Test cache hit/miss scenarios
- Test error fallback behavior

---

## Epic 2: CI/CD Pipeline

**Goal:** Automate build, test, and publish workflows.

### Story 2.1: CI Workflow

**As a** maintainer
**I want** automated CI on every PR
**So that** quality is enforced before merge

#### Acceptance Criteria

- [ ] GitHub Actions workflow file at .github/workflows/ci.yml
- [ ] Runs on push to main and all PRs
- [ ] Steps: checkout, setup node, pnpm install, lint, test, build
- [ ] Fails PR if any step fails
- [ ] Caches pnpm store for speed

#### Technical Notes

- Use actions/checkout@v4
- Use pnpm/action-setup
- Use actions/setup-node with cache

---

### Story 2.2: Release Workflow

**As a** maintainer
**I want** automated npm publishing on version tags
**So that** releases are consistent and traceable

#### Acceptance Criteria

- [ ] GitHub Actions workflow at .github/workflows/release.yml
- [ ] Triggers on v* tags
- [ ] Publishes all packages to npm
- [ ] Creates GitHub Release with changelog
- [ ] Uses npm provenance

#### Technical Notes

- Requires NPM_TOKEN secret
- Use pnpm publish -r --access public
- Consider changesets for version management

---

### Story 2.3: Changesets Integration

**As a** maintainer
**I want** automated changelog generation
**So that** releases are documented

#### Acceptance Criteria

- [ ] Install @changesets/cli
- [ ] Configure .changeset/config.json
- [ ] Document changeset workflow in CONTRIBUTING.md
- [ ] Changelog auto-generated on release

#### Technical Notes

- Run pnpm changeset before PRs with changes
- CI can validate changeset exists

---

## Epic 3: Error Handling

**Goal:** Make all errors actionable with consistent UX.

### Story 3.1: Error Taxonomy

**As a** user
**I want** clear error categories
**So that** I know what went wrong and how to fix it

#### Acceptance Criteria

- [ ] Define error classes: ConfigError, AuthError, NetworkError, PlatformError
- [ ] Each error has: code, message, suggestion
- [ ] Errors are logged without stack traces by default
- [ ] --verbose shows stack traces

#### Technical Notes

Create custom error classes extending Error with code and suggestion properties.

---

### Story 3.2: Exit Codes

**As a** CI pipeline
**I want** consistent exit codes
**So that** I can script around dcs

#### Acceptance Criteria

- [ ] Exit 0: Success
- [ ] Exit 1: General error
- [ ] Exit 2: Config error
- [ ] Exit 3: Auth error
- [ ] Exit 4: Platform error
- [ ] Document exit codes in help

---

### Story 3.3: Progress Indicators

**As a** user
**I want** visual feedback during operations
**So that** I know the CLI is working

#### Acceptance Criteria

- [ ] Spinner during network calls
- [ ] Progress bar for multi-step operations
- [ ] Spinner stops on error or success
- [ ] No spinner in --quiet mode

#### Technical Notes

- Use ora for spinners
- Consider cli-progress for bars

---

## Epic 4: Documentation

**Goal:** Comprehensive docs for users and contributors.

### Story 4.1: Command Reference

**As a** user
**I want** complete command documentation
**So that** I can use all features

#### Acceptance Criteria

- [ ] Document all commands in README
- [ ] Document all options and flags
- [ ] Include examples for each command
- [ ] Troubleshooting section

---

### Story 4.2: Architecture Documentation

**As a** contributor
**I want** architecture docs
**So that** I can understand the codebase

#### Acceptance Criteria

- [ ] Create docs/architecture.md
- [ ] Diagram: package structure
- [ ] Diagram: sync flow
- [ ] Diagram: runtime adapter flow
- [ ] List key abstractions

---

### Story 4.3: Examples Directory

**As a** user
**I want** working examples
**So that** I can get started quickly

#### Acceptance Criteria

- [ ] Create examples/ directory
- [ ] Example: basic-firebase
- [ ] Example: neon-branching
- [ ] Example: cloudflare-worker
- [ ] Example: multi-platform
- [ ] Each example has README

---

## Epic 5: Polish for v1.0

**Goal:** Final polish before stable release.

### Story 5.1: Security Audit

**As a** user
**I want** confidence in security
**So that** I trust dcs with secrets

#### Acceptance Criteria

- [ ] Audit: no secrets logged by default
- [ ] Audit: temp files cleaned up
- [ ] Audit: no unsafe command execution
- [ ] Create SECURITY.md

---

### Story 5.2: Package Metadata

**As an** npm user
**I want** complete package metadata
**So that** I trust the package

#### Acceptance Criteria

- [ ] package.json: description, keywords, repository, homepage
- [ ] package.json: engines, license, author
- [ ] README badges: npm version, CI status, license
- [ ] TypeScript declarations published

---

### Story 5.3: Final Testing

**As a** maintainer
**I want** end-to-end validation
**So that** v1.0 is ready

#### Acceptance Criteria

- [ ] Test full workflow: init -> sync -> run
- [ ] Test on clean machine (Docker)
- [ ] Test with real Doppler project
- [ ] Test each platform adapter
- [ ] Fix all discovered issues
