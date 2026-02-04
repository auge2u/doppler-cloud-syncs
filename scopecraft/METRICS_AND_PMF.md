# Metrics and Product-Market Fit

## North Star Metric

### **Secrets Synced Per Week**

The total number of secrets successfully synced from Doppler to target platforms per week.

**Why this metric:**
- Directly measures core value delivery
- Increases with both user adoption and usage depth
- Easy to instrument (count successful sync operations)

**Target progression:**
| Stage | Target | Meaning |
|-------|--------|---------|
| Early Release | 0 | Not tracked yet |
| v1.0 Launch | 100/week | Creator + early adopters |
| Adoption | 500/week | Growing user base |
| Traction | 2000/week | Clear PMF signal |

---

## Supporting Metrics

### Usage Metrics

| Metric | Definition | Target (v1.0+) |
|--------|------------|----------------|
| Weekly Active Users | Unique users running dcs | 10+ |
| Commands/User/Week | Average commands per user | 5+ |
| Platforms/Project | Avg platforms configured | 1.5+ |
| Sync Success Rate | Successful syncs / total | >95% |

### Adoption Metrics

| Metric | Definition | Target (v1.0) |
|--------|------------|---------------|
| npm Downloads/Week | Total package downloads | 50+ |
| GitHub Stars | Repository stars | 10+ |
| GitHub Issues (external) | Non-creator issues | 3+ |
| Discord/Discussions | Community members | 5+ |

### Quality Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Test Coverage | Line coverage % | >80% |
| CI Pass Rate | Successful CI runs | >95% |
| Time to Fix Bug | Days to close bug issue | <7 days |
| Security Issues | Open security issues | 0 |

---

## Product-Market Fit Signals

### Leading Indicators (Pre-PMF)

| Signal | How to Measure | Threshold |
|--------|----------------|-----------|
| Word of mouth | GitHub traffic sources | Referrals > search |
| Feature requests | GitHub issues labeled "enhancement" | 3+ unique requestors |
| Usage without prompting | Return users without announcement | 5+ returning users |
| Integration requests | "Can you add X platform?" | 2+ platform requests |

### Lagging Indicators (Confirmed PMF)

| Signal | How to Measure | Threshold |
|--------|----------------|-----------|
| Organic growth | Downloads grow without marketing | 10% WoW growth |
| Community contributions | External PRs merged | 2+ contributors |
| Dependency adoption | Projects depending on dcs | 5+ dependents |
| Comparisons | "dcs vs X" discussions | Mentioned alongside competitors |

---

## Tracking Implementation

### Phase 1: Basic (v0.2.0+)

No tracking implemented. Manual observation only.

### Phase 2: Opt-in Telemetry (v1.1.0+)

**Implementation:**
```
DCS_TELEMETRY=1 dcs sync
```

**Events tracked:**
- Command invoked (no arguments)
- Platform type (not credentials)
- Success/failure
- Runtime environment (Node version, OS)

**Privacy guarantees:**
- Disabled by default
- No secret values ever sent
- No identifiable information
- Can be verified by inspecting code

### Phase 3: Dashboard (v2.0+)

- Public dashboard showing aggregate metrics
- Builds community trust

---

## PMF Questionnaire

### Sean Ellis Test

> "How would you feel if you could no longer use dcs?"

Target responses:
- >40% "Very disappointed" = PMF achieved
- 25-40% = Getting close
- <25% = Not there yet

### Implementation

- Prompt after 10th successful sync
- Link to simple form
- Track response rate

---

## Competitive Landscape

### Direct Competitors

| Tool | Comparison |
|------|------------|
| Doppler CLI | dcs extends it, not replaces |
| dotenv-vault | Cloud-based, not Doppler-native |
| Infisical | Full platform, heavier |

### Differentiation

dcs wins when:
1. User is already using Doppler
2. User needs multi-platform sync
3. User wants CLI-first workflow
4. User values shell integration

---

## Anti-Metrics (What Not to Optimize)

| Anti-Metric | Why Ignore |
|-------------|------------|
| Total downloads | Can be gamed, one-time installs |
| Lines of code | More code != better |
| Number of features | Feature creep risk |
| Social media followers | Vanity metric |

---

## Milestone Checklist

### v1.0 Success = All True

- [ ] 3+ external users (not creator)
- [ ] 1+ unsolicited feature request
- [ ] 0 data loss incidents
- [ ] README fully explains value prop

### v1.x Traction = All True

- [ ] 10+ weekly active users
- [ ] 1+ community contribution
- [ ] Mentioned in external blog/tweet
- [ ] 50+ npm downloads/week
