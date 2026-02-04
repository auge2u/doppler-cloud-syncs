# Open Questions

## Prioritization Blockers

These questions should be answered before committing to specific implementation choices.

---

### Q1: Direct API vs CLI Shell-out

**Question:** Should dcs use Doppler's REST API directly instead of shelling out to the Doppler CLI?

**Context:**
- Current: All Doppler operations use `doppler` CLI via execFileSync
- Alternative: Use Doppler REST API with fetch

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| CLI shell-out | Simple, reuses auth, battle-tested | Fragile to CLI changes, slower |
| Direct API | Faster, more control, no CLI dep | Auth complexity, more code |

**Recommendation:** Keep CLI for v1.0, consider API for v2.0 if performance becomes an issue.

**Decision needed by:** Phase 3 (Error Handling)

**Owner:** TBD

---

### Q2: Telemetry Opt-in Mechanism

**Question:** How should optional telemetry be implemented?

**Options:**

1. **Environment variable:** `DCS_TELEMETRY=1`
2. **Config file:** `~/.config/dcs/config.yaml` with `telemetry: true`
3. **Interactive prompt:** Ask on first run
4. **No telemetry:** Rely on GitHub stars and issues only

**Considerations:**
- Privacy expectations are high for secret management tools
- Opt-in reduces data but maintains trust
- Needs clear documentation of what's collected

**Decision needed by:** v1.1.0 planning

**Owner:** TBD

---

### Q3: Homebrew Distribution

**Question:** Should dcs be distributed via Homebrew tap?

**Context:**
- npm is primary distribution channel
- Homebrew would add macOS native install path
- Requires maintaining a tap repository

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| npm only | Simple, single source | Requires Node.js |
| npm + Homebrew | Native macOS feel | Two release paths |

**Recommendation:** Defer to post-v1.0 based on user requests.

**Decision needed by:** v1.0 release

**Owner:** TBD

---

### Q4: Windows Support

**Question:** What level of Windows support should be provided?

**Options:**

1. **Full support:** Test on Windows, fix issues, document
2. **Best effort:** Should work, no testing
3. **Unsupported:** Document as macOS/Linux only

**Current state:** Code should work on Windows (Node is cross-platform, uses execFileSync correctly), but untested.

**Recommendation:** Best effort for v1.0, full support based on demand.

**Decision needed by:** v1.0 release

**Owner:** TBD

---

### Q5: Monorepo vs Separate Repos

**Question:** Should packages remain in a monorepo or be split?

**Context:**
- Currently: All packages in `packages/` with pnpm workspaces
- Alternative: Separate repos for cli, runtime, dotfiles

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| Monorepo | Easy cross-package changes, single CI | Coupled releases |
| Separate repos | Independent versioning | Harder to coordinate |

**Recommendation:** Keep monorepo for v1.0, it's working well.

**Decision needed by:** Not blocking

**Owner:** TBD

---

## Resolved Questions

### Q0: Package Naming (RESOLVED)

**Question:** What should the npm package names be?

**Resolution:** Use scoped packages under `@auge2u/`:
- `@auge2u/dcs` - CLI
- `@auge2u/dcs-runtime` - Runtime adapters
- `@auge2u/dcs-dotfiles` - Shell integration

**Decided:** 2026-02-04

---

## Questions Parking Lot

These questions are noted but not blocking any near-term work.

### Future: Team Features

- How would multi-user access work?
- Should dcs have its own auth or piggyback on Doppler?
- RBAC model?

### Future: Additional Platforms

- Priority order for new platforms?
- Vercel vs AWS Secrets Manager vs Vault?
- Plugin architecture for community platforms?

### Future: GUI

- TUI with blessed/ink vs web dashboard?
- Read-only status vs full management?
- Electron app?

---

## Question Template

```markdown
### Q[N]: [Short Title]

**Question:** [Clear question to be answered]

**Context:** [Background information]

**Options:**
1. [Option A]
2. [Option B]
3. [Option C]

**Trade-offs:**
| Approach | Pros | Cons |
|----------|------|------|

**Recommendation:** [If any]

**Decision needed by:** [Phase or date]

**Owner:** [Who decides]
```
