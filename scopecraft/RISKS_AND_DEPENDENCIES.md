# Risks and Dependencies

## Risk Register

### Risk 1: External CLI Dependency Fragility

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Probability** | Medium |
| **Impact** | CLI breaks when external tools update |

**Description:** dcs relies on shell-out to `doppler`, `firebase`, `wrangler`, and `neon` CLIs. Breaking changes in their output formats or argument syntax will break dcs.

**Mitigation:**
- Pin to known working versions in documentation
- Add integration tests against specific CLI versions
- Consider direct API usage for critical paths (Neon already uses API)

**Contingency:**
- Quick patch releases when external CLIs change
- Document minimum required versions

---

### Risk 2: npm Package Name Collision

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Probability** | Low |
| **Impact** | Cannot publish with intended name |

**Description:** The `@auge2u/dcs` package name may be unavailable or conflict with existing packages.

**Mitigation:**
- Verify npm availability before publishing
- Use scoped package name to reduce collision risk

**Contingency:**
- Alternative names: `@auge2u/doppler-sync`, `@auge2u/dcs-cli`

---

### Risk 3: Security Vulnerability in Secret Handling

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Probability** | Low |
| **Impact** | Secrets exposed in logs, temp files, or memory |

**Description:** As a secret management tool, any security flaw is critical. Secrets could leak through logging, temp files, error messages, or process environment.

**Mitigation:**
- Security audit before v1.0 release
- Never log secret values by default
- Clean up temp files immediately
- Use secure spawn options for child processes

**Contingency:**
- SECURITY.md with reporting process
- Quick security patch releases

---

### Risk 4: Platform API Rate Limiting

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Probability** | Medium |
| **Impact** | Sync failures during heavy usage |

**Description:** Doppler, Firebase, Cloudflare, and Neon have API rate limits. Bulk operations may hit these limits.

**Mitigation:**
- Implement request batching
- Add retry with exponential backoff
- Document rate limit considerations

**Contingency:**
- Add `--throttle` flag for conservative mode

---

### Risk 5: Low Adoption

| Attribute | Value |
|-----------|-------|
| **Severity** | Low |
| **Probability** | Medium |
| **Impact** | Project stagnates, effort wasted |

**Description:** Developer tools are a crowded space. dcs may not gain traction despite being useful.

**Mitigation:**
- Focus on excellent documentation
- Announce on relevant communities (r/devops, HN)
- Write blog post explaining the problem solved

**Contingency:**
- Continue as personal tool if no external adoption
- Consider contributing to Doppler's official tooling

---

## Dependency Map

### External Dependencies

| Dependency | Type | Required For | Risk Level |
|------------|------|--------------|------------|
| **Doppler CLI** | External tool | All secret operations | High |
| **Firebase CLI** | External tool | Firebase sync | Medium |
| **Wrangler** | External tool | Cloudflare sync | Medium |
| **Neon API** | REST API | Neon operations | Low |
| **Node.js 20+** | Runtime | Everything | Low |
| **pnpm** | Build tool | Development only | Low |

### npm Dependencies (CLI)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| commander | ^12.0.0 | CLI framework | Low (stable) |
| inquirer | ^9.2.0 | Interactive prompts | Low |
| chalk | ^5.3.0 | Terminal colors | Low |
| yaml | ^2.4.0 | Config parsing | Low |
| zod | ^3.22.0 | Schema validation | Low |

### npm Dependencies (Runtime)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| firebase-functions | peer | Firebase adapter | Low (optional) |

### Development Dependencies

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| typescript | ^5.4.0 | Language | Low |
| tsup | ^8.0.0 | Build | Low |
| vitest | ^1.4.0 | Testing | Low |
| @types/node | ^20.0.0 | Types | Low |

---

## Dependency Update Strategy

### Automated

- Use Dependabot for security updates
- Weekly dependency review

### Manual Review Required

- Major version bumps of commander, inquirer
- Any changes to child process handling
- TypeScript version updates

### Lock Policy

- `pnpm-lock.yaml` committed
- Exact versions for critical deps
- Range versions for non-critical deps

---

## External Service Dependencies

| Service | Required | Fallback |
|---------|----------|----------|
| Doppler API | Yes | None (core functionality) |
| Firebase | Optional | Skip platform |
| Cloudflare | Optional | Skip platform |
| Neon | Optional | Skip platform |
| npm Registry | Publish only | GitHub Packages |
| GitHub Actions | CI/CD only | Local build |
