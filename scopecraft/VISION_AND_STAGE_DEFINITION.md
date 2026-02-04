# Vision and Stage Definition

## Product Vision

**doppler-cloud-syncs (dcs)** is the unified secret management CLI that treats Doppler as the single source of truth and orchestrates secrets across cloud infrastructure. It eliminates the friction of managing secrets across multiple platforms by providing:

1. **Single command provisioning** - Bootstrap new projects with `dcs init`
2. **Continuous sync** - Push Doppler secrets to Firebase, Cloudflare, Neon, GCP
3. **Runtime injection** - Serverless adapters for secret access at runtime
4. **Developer experience** - Shell integration, completions, auto-environment detection

### Target Users

| Persona | Description | Primary Value |
|---------|-------------|---------------|
| **Solo Developer** | Building side projects across multiple clouds | One tool for all secret management |
| **Platform Engineer** | Managing secrets at scale for teams | Automation, audit trail, consistency |
| **DevOps Lead** | Standardizing secret workflows | Policy enforcement, drift detection |

### Value Proposition

> "Never manually copy secrets between platforms again. Doppler is truth, dcs is the pipe."

---

## Current Stage: Early Release (v0.1.0)

### Stage Signals

| Signal | Evidence |
|--------|----------|
| Core functionality works | All 5 development phases complete |
| Not battle-tested | Version 0.1.0, no published packages |
| Documentation exists | README with usage examples |
| No production users | No usage telemetry, no issues |

### What's Built

- CLI with 15+ commands across core, Neon, and automation
- Runtime adapters for 3 serverless platforms
- Shell integration for bash/zsh
- Config system with env interpolation

### What's Missing for v1.0

- Test coverage and CI/CD pipeline
- Error handling hardening
- Published npm packages
- Real-world validation

---

## Next Stage: Production Ready (v1.0)

### Completion Criteria for v1.0

| Criterion | Measurable Target |
|-----------|-------------------|
| **Test Coverage** | >80% line coverage on CLI package |
| **CI/CD** | GitHub Actions with build/test/publish |
| **Documentation** | API docs, troubleshooting guide |
| **Published** | Packages on npm registry |
| **Stability** | 30 days without breaking changes |
| **Adoption** | 5+ GitHub stars or 3+ external users |

### Definition of Done for v1.0

1. All packages published to npm with proper versioning
2. GitHub Actions workflow for automated releases
3. Comprehensive test suite with mocked external calls
4. Error messages are actionable and helpful
5. README includes troubleshooting section
6. Changelog maintained from v0.1.0 forward

---

## Long-term Vision (v2.0+)

### Potential Directions

| Direction | Description | Prerequisite |
|-----------|-------------|--------------|
| **Team Features** | Multi-user, RBAC, audit logs | v1.0 adoption |
| **More Platforms** | Vercel, AWS Secrets Manager, Vault | User demand |
| **GUI/TUI** | Visual dashboard for status | Stable CLI |
| **Doppler Plugin** | Native integration in Doppler UI | Doppler partnership |

### Anti-Goals

- **Not a secrets vault** - Doppler is the vault, dcs is orchestration
- **Not multi-tenant SaaS** - CLI tool, not hosted service
- **Not enterprise-first** - Individual developers first, teams later
