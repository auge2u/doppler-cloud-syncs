# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in doppler-cloud-syncs, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email security concerns to the maintainers directly
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a more detailed response within 7 days.

## Security Model

### Secret Handling

doppler-cloud-syncs is designed to handle secrets securely:

- **No secret logging**: Secret values are never written to stdout, stderr, or log files
- **Memory only**: Secrets are held in memory only during sync operations
- **No persistence**: Secrets are not written to disk except when syncing to target platforms via their official CLIs
- **Temp file cleanup**: Any temporary files (e.g., for bulk Cloudflare uploads) are deleted immediately after use in `finally` blocks

### Command Execution

All external commands are executed safely:

- **No shell interpolation**: Uses `execFileSync` and `spawn` with array arguments, preventing shell injection attacks
- **Trusted CLIs only**: Only executes official CLIs: `doppler`, `firebase`, `wrangler`, `psql`, `git`
- **No user-provided shell commands**: The `dcs run` command spawns processes directly without shell interpretation

### Authentication

- **Delegated auth**: Authentication is delegated to platform CLIs (Doppler, Firebase, Cloudflare)
- **No credential storage**: dcs does not store credentials; it relies on platform CLI authentication
- **API keys**: When API keys are needed (e.g., Neon), they are read from environment variables or command-line flags, never stored

### Runtime Adapters

The `@auge2u/dcs-runtime` package:

- **Caching**: Secrets are cached in memory with a default TTL of 5 minutes
- **No logging**: Secret values are never logged, even in error messages
- **Fallback chain**: Primary source → Doppler API → Environment variables
- **HTTPS only**: All Doppler API calls use HTTPS

## Best Practices

### For Users

1. **Use environment variables** for API keys instead of command-line flags when possible
2. **Restrict API key permissions** to minimum required scopes
3. **Use Doppler service tokens** in CI/CD instead of personal tokens
4. **Review dcs.yaml** before committing to ensure no sensitive values are included
5. **Use `--dry-run`** before syncing to production environments

### For CI/CD

1. **Use secrets management** in your CI/CD platform for `NEON_API_KEY`, `DOPPLER_TOKEN`
2. **Limit secret exposure** by using `dcs sync --quiet` to minimize output
3. **Audit access** to CI/CD secrets regularly

### For Development

1. **Use separate Doppler configs** for development, staging, and production
2. **Use Neon branching** to isolate development databases
3. **Never commit** `.env` files or `dcs.yaml` with real credentials

## Security Audit Checklist

The following security properties are verified in code review:

- [ ] No `console.log` calls that could leak secret values
- [ ] Temp files are deleted in `finally` blocks
- [ ] External commands use `execFileSync`/`spawn` with array arguments
- [ ] No string interpolation in shell commands
- [ ] API responses are not logged in full
- [ ] Error messages do not include secret values

## Dependencies

We regularly update dependencies to patch security vulnerabilities:

- Run `pnpm audit` to check for known vulnerabilities
- Dependencies are locked with `pnpm-lock.yaml`
- Major dependency updates are reviewed for security implications

## Changelog

Security-related changes are noted in the [CHANGELOG](./CHANGELOG.md) with the `security` label.
