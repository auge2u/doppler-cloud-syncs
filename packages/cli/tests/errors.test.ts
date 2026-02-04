import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExitCode,
  ConfigError,
  AuthError,
  NetworkError,
  PlatformError,
  isDcsError,
  handleError,
} from '../src/errors.js';

describe('errors', () => {
  describe('ExitCode', () => {
    it('should have correct numeric values', () => {
      expect(ExitCode.Success).toBe(0);
      expect(ExitCode.GeneralError).toBe(1);
      expect(ExitCode.ConfigError).toBe(2);
      expect(ExitCode.AuthError).toBe(3);
      expect(ExitCode.PlatformError).toBe(4);
    });
  });

  describe('ConfigError', () => {
    it('should create error with code and exit code', () => {
      const error = new ConfigError('Test message');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.exitCode).toBe(ExitCode.ConfigError);
      expect(error.message).toBe('Test message');
    });

    it('should include suggestion when provided', () => {
      const error = new ConfigError('Test message', 'Try this');
      expect(error.suggestion).toBe('Try this');
    });

    it('should format without stack trace by default', () => {
      const error = new ConfigError('Test message', 'Try this');
      const formatted = error.format();
      expect(formatted).toContain('[CONFIG_ERROR]');
      expect(formatted).toContain('Test message');
      expect(formatted).toContain('Suggestion');
      expect(formatted).toContain('Try this');
      expect(formatted).not.toContain('at ');
    });

    it('should show stack trace with verbose flag', () => {
      const error = new ConfigError('Test message');
      const formatted = error.format(true);
      expect(formatted).toContain('at ');
    });

    it('should have static factory for missing config', () => {
      const error = ConfigError.missingConfig();
      expect(error.message).toContain('No dcs.yaml found');
      expect(error.suggestion).toContain('dcs init');
    });

    it('should have static factory for invalid YAML', () => {
      const error = ConfigError.invalidYaml('/path/to/file.yaml', 'bad indent');
      expect(error.message).toContain('/path/to/file.yaml');
      expect(error.message).toContain('bad indent');
    });

    it('should have static factory for schema validation', () => {
      const error = ConfigError.schemaValidation(['error 1', 'error 2']);
      expect(error.message).toContain('error 1');
      expect(error.message).toContain('error 2');
    });

    it('should have static factory for missing env var', () => {
      const error = ConfigError.missingEnvVar('API_KEY');
      expect(error.message).toContain('API_KEY');
      expect(error.suggestion).toContain('export API_KEY');
    });
  });

  describe('AuthError', () => {
    it('should create error with correct code', () => {
      const error = new AuthError('Test auth error');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.exitCode).toBe(ExitCode.AuthError);
    });

    it('should have static factory for Doppler auth', () => {
      const error = AuthError.dopplerNotAuthenticated();
      expect(error.message).toContain('Not authenticated with Doppler');
      expect(error.suggestion).toContain('doppler login');
    });

    it('should have static factory for Neon API key', () => {
      const error = AuthError.neonApiKeyMissing();
      expect(error.message).toContain('Neon API key');
      expect(error.suggestion).toContain('NEON_API_KEY');
    });
  });

  describe('NetworkError', () => {
    it('should create error with correct code', () => {
      const error = new NetworkError('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.exitCode).toBe(ExitCode.GeneralError);
    });

    it('should have static factory for connection failed', () => {
      const error = NetworkError.connectionFailed('Doppler API');
      expect(error.message).toContain('Doppler API');
    });

    it('should have static factory for timeout', () => {
      const error = NetworkError.timeout('Firebase');
      expect(error.message).toContain('timed out');
    });

    it('should provide contextual suggestions for API errors', () => {
      expect(NetworkError.apiError('API', 401).suggestion).toContain('authentication');
      expect(NetworkError.apiError('API', 403).suggestion).toContain('permissions');
      expect(NetworkError.apiError('API', 404).suggestion).toContain('not found');
      expect(NetworkError.apiError('API', 500).suggestion).toContain('issues');
    });
  });

  describe('PlatformError', () => {
    it('should create error with platform name', () => {
      const error = new PlatformError('firebase', 'Project not found');
      expect(error.code).toBe('PLATFORM_ERROR');
      expect(error.exitCode).toBe(ExitCode.PlatformError);
      expect(error.platform).toBe('firebase');
      expect(error.message).toContain('[firebase]');
    });

    it('should have static factory for not configured', () => {
      const error = PlatformError.notConfigured('Cloudflare');
      expect(error.message).toContain('Cloudflare');
      expect(error.suggestion).toContain('dcs.yaml');
    });

    it('should have static factory for CLI not installed', () => {
      const error = PlatformError.cliNotInstalled('Firebase', 'firebase-tools');
      expect(error.message).toContain('firebase-tools');
      expect(error.suggestion).toContain('npm install -g firebase-tools');
    });
  });

  describe('isDcsError', () => {
    it('should return true for DcsError subclasses', () => {
      expect(isDcsError(new ConfigError('test'))).toBe(true);
      expect(isDcsError(new AuthError('test'))).toBe(true);
      expect(isDcsError(new NetworkError('test'))).toBe(true);
      expect(isDcsError(new PlatformError('p', 'test'))).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isDcsError(new Error('test'))).toBe(false);
      expect(isDcsError('string error')).toBe(false);
      expect(isDcsError(null)).toBe(false);
    });
  });

  describe('handleError', () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should exit with correct code for DcsError', () => {
      expect(() => handleError(new ConfigError('test'))).toThrow('process.exit(2)');
      expect(() => handleError(new AuthError('test'))).toThrow('process.exit(3)');
      expect(() => handleError(new PlatformError('p', 'test'))).toThrow('process.exit(4)');
    });

    it('should exit with code 1 for unknown errors', () => {
      expect(() => handleError(new Error('test'))).toThrow('process.exit(1)');
      expect(() => handleError('string error')).toThrow('process.exit(1)');
    });

    it('should log formatted error message', () => {
      try {
        handleError(new ConfigError('test', 'suggestion'));
      } catch {
        // Expected
      }
      expect(errorSpy).toHaveBeenCalled();
      const output = errorSpy.mock.calls[0][0];
      expect(output).toContain('CONFIG_ERROR');
      expect(output).toContain('test');
    });
  });
});
