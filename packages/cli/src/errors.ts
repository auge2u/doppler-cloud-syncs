import chalk from 'chalk';

/**
 * Exit codes for dcs CLI
 */
export enum ExitCode {
  Success = 0,
  GeneralError = 1,
  ConfigError = 2,
  AuthError = 3,
  PlatformError = 4,
}

/**
 * Base error class for dcs CLI
 */
export abstract class DcsError extends Error {
  abstract readonly code: string;
  abstract readonly exitCode: ExitCode;
  abstract readonly suggestion?: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Format error for display (no stack trace by default)
   */
  format(verbose = false): string {
    const lines: string[] = [];

    lines.push(`${chalk.red('Error')} [${this.code}]: ${this.message}`);

    if (this.suggestion) {
      lines.push(`${chalk.yellow('Suggestion')}: ${this.suggestion}`);
    }

    if (verbose && this.stack) {
      lines.push('');
      lines.push(chalk.gray(this.stack));
    }

    return lines.join('\n');
  }
}

/**
 * Configuration errors (missing config, invalid schema, etc.)
 */
export class ConfigError extends DcsError {
  readonly code = 'CONFIG_ERROR';
  readonly exitCode = ExitCode.ConfigError;
  readonly suggestion?: string;

  constructor(message: string, suggestion?: string) {
    super(message);
    this.suggestion = suggestion;
  }

  static missingConfig(): ConfigError {
    return new ConfigError(
      'No dcs.yaml found in current directory or parents',
      'Run `dcs init` to create a configuration file'
    );
  }

  static invalidYaml(path: string, details?: string): ConfigError {
    return new ConfigError(
      `Invalid YAML in ${path}${details ? `: ${details}` : ''}`,
      'Check the file for syntax errors (missing colons, improper indentation)'
    );
  }

  static schemaValidation(errors: string[]): ConfigError {
    return new ConfigError(
      `Configuration validation failed:\n  ${errors.join('\n  ')}`,
      'Check dcs.yaml against the expected schema'
    );
  }

  static missingEnvVar(varName: string): ConfigError {
    return new ConfigError(
      `Environment variable ${varName} is not set`,
      `Set it with: export ${varName}=<value>`
    );
  }
}

/**
 * Authentication errors (invalid tokens, expired credentials, etc.)
 */
export class AuthError extends DcsError {
  readonly code = 'AUTH_ERROR';
  readonly exitCode = ExitCode.AuthError;
  readonly suggestion?: string;

  constructor(message: string, suggestion?: string) {
    super(message);
    this.suggestion = suggestion;
  }

  static dopplerNotAuthenticated(): AuthError {
    return new AuthError(
      'Not authenticated with Doppler',
      'Run `doppler login` to authenticate'
    );
  }

  static dopplerTokenInvalid(): AuthError {
    return new AuthError(
      'Doppler token is invalid or expired',
      'Run `doppler login` to refresh your credentials'
    );
  }

  static firebaseNotAuthenticated(): AuthError {
    return new AuthError(
      'Not authenticated with Firebase',
      'Run `firebase login` to authenticate'
    );
  }

  static cloudflareNotAuthenticated(): AuthError {
    return new AuthError(
      'Not authenticated with Cloudflare',
      'Run `wrangler login` or set CLOUDFLARE_API_TOKEN'
    );
  }

  static neonApiKeyMissing(): AuthError {
    return new AuthError(
      'Neon API key not found',
      'Set NEON_API_KEY environment variable or pass --api-key'
    );
  }
}

/**
 * Network errors (connection failures, timeouts, etc.)
 */
export class NetworkError extends DcsError {
  readonly code = 'NETWORK_ERROR';
  readonly exitCode = ExitCode.GeneralError;
  readonly suggestion?: string;

  constructor(message: string, suggestion?: string) {
    super(message);
    this.suggestion = suggestion;
  }

  static connectionFailed(service: string): NetworkError {
    return new NetworkError(
      `Failed to connect to ${service}`,
      'Check your internet connection and try again'
    );
  }

  static timeout(service: string): NetworkError {
    return new NetworkError(
      `Request to ${service} timed out`,
      'The service may be slow or unavailable. Try again later.'
    );
  }

  static apiError(service: string, status: number, details?: string): NetworkError {
    return new NetworkError(
      `${service} API returned error ${status}${details ? `: ${details}` : ''}`,
      status === 401 ? 'Check your authentication credentials' :
      status === 403 ? 'Check your permissions for this resource' :
      status === 404 ? 'The requested resource was not found' :
      status >= 500 ? 'The service may be experiencing issues. Try again later.' :
      undefined
    );
  }
}

/**
 * Platform-specific errors (Firebase, Cloudflare, Neon, etc.)
 */
export class PlatformError extends DcsError {
  readonly code = 'PLATFORM_ERROR';
  readonly exitCode = ExitCode.PlatformError;
  readonly suggestion?: string;
  readonly platform: string;

  constructor(platform: string, message: string, suggestion?: string) {
    super(`[${platform}] ${message}`);
    this.platform = platform;
    this.suggestion = suggestion;
  }

  static notConfigured(platform: string): PlatformError {
    return new PlatformError(
      platform,
      `${platform} is not configured`,
      `Add ${platform} configuration to dcs.yaml`
    );
  }

  static cliNotInstalled(platform: string, cli: string): PlatformError {
    return new PlatformError(
      platform,
      `${cli} CLI is not installed`,
      `Install it with: npm install -g ${cli}`
    );
  }

  static operationFailed(platform: string, operation: string, details?: string): PlatformError {
    return new PlatformError(
      platform,
      `Failed to ${operation}${details ? `: ${details}` : ''}`,
      undefined
    );
  }
}

/**
 * Check if an error is a DcsError
 */
export function isDcsError(error: unknown): error is DcsError {
  return error instanceof DcsError;
}

/**
 * Handle an error and exit with appropriate code
 */
export function handleError(error: unknown, verbose = false): never {
  if (isDcsError(error)) {
    console.error(error.format(verbose));
    process.exit(error.exitCode);
  }

  // Unknown error - wrap in general error
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red('Error:'), message);

  if (verbose && error instanceof Error && error.stack) {
    console.error(chalk.gray(error.stack));
  }

  process.exit(ExitCode.GeneralError);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<void>>(
  fn: T,
  verbose = false
): T {
  return (async (...args: unknown[]) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error, verbose);
    }
  }) as T;
}
