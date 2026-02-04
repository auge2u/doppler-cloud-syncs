# Roadmap

## Overview

This roadmap takes doppler-cloud-syncs from Early Release (v0.1.0) to Production Ready (v1.0) and beyond.

```
Current: v0.1.0 (Early Release)
   │
   ▼
Phase 1: Testing & Quality ──────────────► v0.2.0
   │
   ▼
Phase 2: CI/CD & Publishing ─────────────► v0.3.0
   │
   ▼
Phase 3: Error Handling & UX ────────────► v0.4.0
   │
   ▼
Phase 4: Documentation & Polish ─────────► v1.0.0 (Production Ready)
   │
   ▼
Phase 5: Adoption & Iteration ───────────► v1.x
```

---

## Phase 1: Testing & Quality (v0.2.0)

**Goal:** Establish confidence in correctness through comprehensive testing.

**Duration:** 1-2 weeks

### Deliverables

| Item | Description |
|------|-------------|
| Unit tests for config | Schema validation, env interpolation, error cases |
| Unit tests for platforms | Mocked CLI calls for Doppler, Firebase, Cloudflare, Neon |
| Unit tests for commands | Command option parsing, output formatting |
| Integration tests | End-to-end flows with mocked external services |
| Test utilities | Fixtures, mocks, test helpers |

### Exit Criteria

- [ ] >80% line coverage on `packages/cli`
- [ ] >70% line coverage on `packages/runtime`
- [ ] All tests pass locally with `pnpm test`
- [ ] Test report generated

---

## Phase 2: CI/CD & Publishing (v0.3.0)

**Goal:** Automate quality gates and enable public distribution.

**Duration:** 1 week

### Deliverables

| Item | Description |
|------|-------------|
| GitHub Actions CI | Build, lint, test on PR and push |
| GitHub Actions Release | Publish to npm on tag |
| Changesets | Automated changelog and version bumping |
| npm publish setup | Scoped packages, access tokens, provenance |
| Homebrew formula | Optional: `brew install auge2u/tap/dcs` |

### Exit Criteria

- [ ] CI runs on every PR
- [ ] `@auge2u/dcs` published to npm
- [ ] `@auge2u/dcs-runtime` published to npm
- [ ] `@auge2u/dcs-dotfiles` published to npm
- [ ] CHANGELOG.md exists and auto-updates

---

## Phase 3: Error Handling & UX (v0.4.0)

**Goal:** Make failures actionable and output clear.

**Duration:** 1 week

### Deliverables

| Item | Description |
|------|-------------|
| Error taxonomy | Categorize errors: config, auth, network, platform |
| Actionable messages | Every error suggests a fix |
| Exit codes | Consistent codes for scripting |
| Verbose mode | `--verbose` flag for debugging |
| Quiet mode | `--quiet` for CI/scripts |
| Progress indicators | Spinners for long operations |

### Exit Criteria

- [ ] No stack traces in normal error output
- [ ] All errors have exit code != 0
- [ ] `--verbose` shows debug info
- [ ] `--quiet` suppresses non-error output
- [ ] Spinner shown during network calls

---

## Phase 4: Documentation & Polish (v1.0.0)

**Goal:** Production-ready with comprehensive docs.

**Duration:** 1-2 weeks

### Deliverables

| Item | Description |
|------|-------------|
| API documentation | Command reference with all options |
| Troubleshooting guide | Common issues and solutions |
| Migration guide | From manual sync to dcs |
| Architecture docs | For contributors |
| Examples directory | Real-world config examples |
| Security policy | SECURITY.md |

### Exit Criteria

- [ ] README has quick start, full reference, troubleshooting
- [ ] `dcs --help` output is complete and accurate
- [ ] Examples work out of the box
- [ ] CONTRIBUTING.md exists
- [ ] LICENSE file present
- [ ] No placeholder markers in docs

---

## Phase 5: Adoption & Iteration (v1.x)

**Goal:** Gather real-world feedback and iterate.

**Duration:** Ongoing

### Deliverables

| Item | Description |
|------|-------------|
| Announcement | Blog post, Twitter, Reddit |
| Feedback channels | GitHub Discussions, issue templates |
| Usage analytics | Optional opt-in telemetry |
| Bug fixes | Address issues from users |
| New platforms | Based on demand (Vercel, AWS, etc.) |

### Success Metrics

- 50+ npm downloads/week
- 3+ GitHub issues from external users
- 1+ community contribution

---

## Timeline Summary

| Phase | Version | Duration | Cumulative |
|-------|---------|----------|------------|
| Phase 1: Testing | v0.2.0 | 1-2 weeks | Week 2 |
| Phase 2: CI/CD | v0.3.0 | 1 week | Week 3 |
| Phase 3: Error UX | v0.4.0 | 1 week | Week 4 |
| Phase 4: Docs | v1.0.0 | 1-2 weeks | Week 6 |
| Phase 5: Adoption | v1.x | Ongoing | - |

**Target v1.0 release: 4-6 weeks from start**

---

## Out of Scope for v1.0

These are explicitly deferred to post-v1.0:

- GUI/TUI dashboard
- Team/org management features
- Vercel platform support
- AWS Secrets Manager support
- HashiCorp Vault support
- Windows support (Node works, but untested)
- Doppler API direct integration (uses CLI)
