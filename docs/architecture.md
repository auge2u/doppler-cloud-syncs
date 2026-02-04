# Architecture Documentation

This document describes the architecture of doppler-cloud-syncs (dcs) for contributors and maintainers.

## Package Structure

```
doppler-cloud-syncs/
├── packages/
│   ├── cli/                    # @auge2u/dcs - CLI tool
│   │   ├── src/
│   │   │   ├── commands/       # Command implementations
│   │   │   ├── config/         # Configuration loading & validation
│   │   │   ├── platforms/      # Platform API clients
│   │   │   ├── ui/             # Spinners and progress indicators
│   │   │   ├── errors.ts       # Error taxonomy
│   │   │   └── index.ts        # CLI entry point
│   │   └── tests/
│   │
│   ├── runtime/                # @auge2u/dcs-runtime - Serverless adapters
│   │   ├── src/
│   │   │   ├── adapters/       # Platform-specific adapters
│   │   │   │   ├── firebase.ts
│   │   │   │   ├── cloudflare.ts
│   │   │   │   └── cloudrun.ts
│   │   │   ├── core.ts         # Shared secret fetching logic
│   │   │   ├── cache.ts        # In-memory caching
│   │   │   └── fetcher.ts      # Doppler API client
│   │   └── tests/
│   │
│   └── dotfiles/               # @auge2u/dcs-dotfiles - Shell integration
│       └── src/
│           ├── shell/          # Shell scripts (bash, zsh)
│           └── completions/    # Tab completion scripts
│
├── examples/                   # Working examples
├── docs/                       # Documentation
└── .gt/                        # Gastown work tracking
    ├── beads/                  # Individual work items
    └── convoys/                # Bundled releases
```

## Package Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Environment                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐    ┌──────────────────┐                  │
│   │  @auge2u/dcs     │    │ @auge2u/dcs-     │                  │
│   │  (CLI)           │    │ dotfiles         │                  │
│   │                  │    │ (Shell)          │                  │
│   │  • dcs sync      │    │                  │                  │
│   │  • dcs neon      │    │  • Completions   │                  │
│   │  • dcs run       │    │  • Aliases       │                  │
│   │  • dcs hooks     │    │  • Auto-env      │                  │
│   └────────┬─────────┘    └────────┬─────────┘                  │
│            │                       │                             │
│            └───────────┬───────────┘                             │
│                        │                                         │
│                        ▼                                         │
│            ┌───────────────────────┐                             │
│            │   dcs.yaml Config     │                             │
│            │                       │                             │
│            │  • doppler project    │                             │
│            │  • platform configs   │                             │
│            │  • env mappings       │                             │
│            └───────────────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Serverless Runtime                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                 @auge2u/dcs-runtime                       │  │
│   │                                                           │  │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│   │  │  Firebase   │ │ Cloudflare  │ │  Cloud Run  │        │  │
│   │  │  Adapter    │ │  Adapter    │ │  Adapter    │        │  │
│   │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘        │  │
│   │         │               │               │                │  │
│   │         └───────────────┼───────────────┘                │  │
│   │                         │                                │  │
│   │                         ▼                                │  │
│   │              ┌──────────────────┐                        │  │
│   │              │   Core Module    │                        │  │
│   │              │                  │                        │  │
│   │              │  • getSecrets()  │                        │  │
│   │              │  • cache layer   │                        │  │
│   │              │  • fallbacks     │                        │  │
│   │              └──────────────────┘                        │  │
│   │                                                           │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │   Doppler   │  │    Neon     │  │  Firebase/  │             │
│   │   API       │  │    API      │  │  Cloudflare │             │
│   │             │  │             │  │    APIs     │             │
│   │  (source    │  │  (database  │  │  (target    │             │
│   │   of truth) │  │  branching) │  │  platforms) │             │
│   └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Abstractions

### 1. DcsConfig

The configuration schema that defines how secrets flow between services.

```typescript
interface DcsConfig {
  project: string;
  doppler: {
    project: string;
    configs: Record<string, string>;  // env -> doppler config
  };
  platforms: {
    firebase?: { project_id: string };
    cloudflare?: { account_id: string; worker?: string };
    neon?: {
      project_id: string;
      database: string;
      migrations_dir?: string;
      branch_mapping?: Record<string, string>;
    };
  };
}
```

### 2. Platform Clients

Each platform has a client interface for interacting with its API:

```typescript
interface PlatformClient {
  // Get current secrets from the platform
  getSecrets(): Promise<Record<string, string>>;

  // Compare Doppler secrets with platform
  diff(dopplerSecrets: Record<string, string>): Promise<DiffResult>;

  // Sync secrets from Doppler to platform
  syncFromDoppler(secrets: Record<string, string>): Promise<void>;
}
```

### 3. Error Taxonomy

Structured error classes with exit codes for scripting:

```typescript
abstract class DcsError extends Error {
  abstract readonly code: string;      // e.g., 'CONFIG_ERROR'
  abstract readonly exitCode: ExitCode; // 0-4
  abstract readonly suggestion?: string; // Actionable help
}
```

### 4. Runtime Adapters

Platform-specific wrappers that inject secrets into serverless functions:

```typescript
// Firebase example
type FirebaseHandler<T> = (
  req: Request,
  res: Response,
  secrets: Record<string, string>
) => T;

function withSecrets<T>(
  options: SecretOptions,
  handler: FirebaseHandler<T>
): HttpsFunction;
```

## Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        dcs sync                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Load Configuration                                            │
│    • Find dcs.yaml in cwd or parent directories                 │
│    • Parse YAML and validate against schema                     │
│    • Resolve environment (dev/staging/prod) from --config flag  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Fetch Secrets from Doppler                                    │
│    • Use doppler CLI or DOPPLER_TOKEN                           │
│    • Fetch secrets for the specified config                     │
│    • Returns Record<string, string>                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. For Each Configured Platform                                  │
│                                                                  │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │ 3a. Calculate Diff                                        │ │
│    │     • Get current secrets from platform                   │ │
│    │     • Compare with Doppler secrets                        │ │
│    │     • Identify: toAdd, toUpdate, toRemove                 │ │
│    └──────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│    ┌──────────────────────────────────────────────────────────┐ │
│    │ 3b. Apply Changes (unless --dry-run)                      │ │
│    │     • Firebase: Update runtime config                     │ │
│    │     • Cloudflare: Update Workers secrets                  │ │
│    │     • Show spinner during network calls                   │ │
│    └──────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Report Results                                                │
│    • Summary: platform, +added, ~updated, -removed              │
│    • Exit 0 on success, 4 on platform error                     │
└─────────────────────────────────────────────────────────────────┘
```

## Runtime Adapter Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Serverless Function Request                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. withSecrets() Wrapper                                         │
│    • Intercepts incoming request                                │
│    • Extracts platform-specific environment (env bindings)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Secret Resolution                                             │
│                                                                  │
│    ┌────────────────────────────────────────────────────────┐   │
│    │ Check Cache                                             │   │
│    │ • If secrets cached and not expired, return from cache  │   │
│    └────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼ (cache miss)                      │
│    ┌────────────────────────────────────────────────────────┐   │
│    │ Try Primary Source                                      │   │
│    │ • Firebase: defineSecret() / runtime config             │   │
│    │ • Cloudflare: env bindings                              │   │
│    │ • Cloud Run: environment variables                      │   │
│    └────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼ (if missing keys)                 │
│    ┌────────────────────────────────────────────────────────┐   │
│    │ Fallback to Doppler API                                 │   │
│    │ • Fetch via DOPPLER_TOKEN                               │   │
│    │ • Requires network access                               │   │
│    └────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼ (if API fails)                    │
│    ┌────────────────────────────────────────────────────────┐   │
│    │ Fallback to Environment Variables                       │   │
│    │ • Read from process.env                                 │   │
│    │ • Useful for local development                          │   │
│    └────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Cache Secrets                                                 │
│    • Store in memory with TTL (default: 5 minutes)              │
│    • Prevents repeated API calls in same instance               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Invoke User Handler                                           │
│    • Pass secrets as additional parameter                       │
│    • handler(req, res, secrets) for Firebase                    │
│    • handler.fetch(req, env, secrets, ctx) for Cloudflare       │
└─────────────────────────────────────────────────────────────────┘
```

## Neon Branch Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Development Workflow                         │
└─────────────────────────────────────────────────────────────────┘

  main (production)
      │
      ├──────────────────────────────────────────────────────────┐
      │                                                          │
      ▼                                                          │
  ┌─────────┐                                                    │
  │  main   │◄─── production branch (protected)                  │
  │ branch  │                                                    │
  └────┬────┘                                                    │
       │                                                         │
       │ dcs neon branch create staging                          │
       ▼                                                         │
  ┌─────────┐                                                    │
  │ staging │◄─── staging environment                            │
  │ branch  │     (copy of main at creation time)                │
  └────┬────┘                                                    │
       │                                                         │
       │ dcs neon branch create feature-x                        │
       ▼                                                         │
  ┌─────────┐                                                    │
  │feature-x│◄─── feature branch                                 │
  │ branch  │     (copy of staging at creation time)             │
  └────┬────┘                                                    │
       │                                                         │
       │ Developer works on feature-x...                         │
       │                                                         │
       │ dcs neon branch switch feature-x -c dev                 │
       │ (Updates Doppler dev config with feature-x connection)  │
       │                                                         │
       │ dcs neon branch reset feature-x                         │
       │ (Resets to staging state, discards all changes)         │
       │                                                         │
       │ dcs neon branch delete feature-x                        │
       │ (Cleans up when feature is merged)                      │
       │                                                         │
       └─────────────────────────────────────────────────────────┘

Key Operations:
  • create: Fork database at point-in-time (instant, copy-on-write)
  • switch: Update Doppler with new connection string
  • reset:  Discard changes, sync with parent
  • delete: Clean up branch (cannot delete main)
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                     Error Hierarchy                              │
└─────────────────────────────────────────────────────────────────┘

  DcsError (abstract)
      │
      ├── ConfigError (exit code 2)
      │   ├── missingConfig()
      │   ├── invalidYaml()
      │   ├── schemaValidation()
      │   └── missingEnvVar()
      │
      ├── AuthError (exit code 3)
      │   ├── dopplerNotAuthenticated()
      │   ├── firebaseNotAuthenticated()
      │   ├── cloudflareNotAuthenticated()
      │   └── neonApiKeyMissing()
      │
      ├── NetworkError (exit code 1)
      │   ├── connectionFailed()
      │   ├── timeout()
      │   └── apiError()
      │
      └── PlatformError (exit code 4)
          ├── notConfigured()
          ├── cliNotInstalled()
          └── operationFailed()

Error Flow:
  1. Command throws specific error type
  2. Error propagates to top-level handler
  3. handleError() formats message (no stack trace by default)
  4. process.exit() with appropriate code
  5. --verbose shows full stack trace
```

## Testing Strategy

### Unit Tests
- Individual functions and classes
- Mock external dependencies (APIs, file system)
- Fast, isolated, deterministic

### Integration Tests
- Command execution via Commander
- Mock platform clients
- Test error handling paths

### Test Organization
```
packages/cli/tests/
├── commands/           # Command integration tests
│   ├── init.test.ts
│   ├── sync.test.ts
│   ├── neon.test.ts
│   └── ...
├── platforms/          # Platform client tests
│   ├── doppler.test.ts
│   ├── firebase.test.ts
│   └── ...
├── config/             # Config loading tests
├── ui/                 # Spinner tests
└── errors.test.ts      # Error class tests
```

## Contributing

1. **Add new platform**: Create client in `packages/cli/src/platforms/`
2. **Add runtime adapter**: Create adapter in `packages/runtime/src/adapters/`
3. **Add command**: Create in `packages/cli/src/commands/` and register in index
4. **Add error type**: Extend `DcsError` in `packages/cli/src/errors.ts`

All changes should include tests and follow the existing patterns.
