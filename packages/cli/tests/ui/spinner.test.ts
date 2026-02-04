import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSpinner, withSpinner, ProgressTracker } from '../../src/ui/spinner.js';

// Mock ora
vi.mock('ora', () => {
  const mockSpinner = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    stopAndPersist: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    frame: vi.fn().mockReturnValue(''),
    text: '',
    prefixText: '',
    suffixText: '',
    color: 'cyan',
    indent: 0,
    spinner: { interval: 80, frames: ['-'] },
    isSpinning: false,
  };

  return {
    default: vi.fn(() => mockSpinner),
  };
});

describe('spinner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSpinner', () => {
    it('should create spinner when enabled', async () => {
      const { default: ora } = await import('ora');
      const spinner = createSpinner({ enabled: true, text: 'Loading...' });

      expect(ora).toHaveBeenCalledWith({ text: 'Loading...' });
    });

    it('should return noop spinner when disabled', () => {
      const spinner = createSpinner({ enabled: false });

      // Should not throw and should return chainable methods
      expect(() => spinner.start()).not.toThrow();
      expect(() => spinner.stop()).not.toThrow();
      expect(() => spinner.succeed('done')).not.toThrow();
      expect(() => spinner.fail('error')).not.toThrow();
    });

    it('should default to enabled', async () => {
      const { default: ora } = await import('ora');
      createSpinner({ text: 'Test' });

      expect(ora).toHaveBeenCalled();
    });
  });

  describe('withSpinner', () => {
    it('should run operation with spinner', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      const result = await withSpinner('Loading...', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
    });

    it('should succeed on completion', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      await withSpinner('Loading...', operation, { successText: 'Done!' });

      // Operation completed successfully
      expect(operation).toHaveBeenCalled();
    });

    it('should fail on error and rethrow', async () => {
      const error = new Error('Test error');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        withSpinner('Loading...', operation, { failText: 'Failed!' })
      ).rejects.toThrow('Test error');
    });

    it('should not show spinner in quiet mode', async () => {
      const operation = vi.fn().mockResolvedValue('result');

      await withSpinner('Loading...', operation, { quiet: true });

      expect(operation).toHaveBeenCalled();
    });
  });

  describe('ProgressTracker', () => {
    it('should track progress through steps', () => {
      const tracker = new ProgressTracker(['Step 1', 'Step 2', 'Step 3']);

      // Should not throw
      expect(() => tracker.nextStep()).not.toThrow();
      expect(() => tracker.nextStep()).not.toThrow();
      expect(() => tracker.nextStep()).not.toThrow();
      expect(() => tracker.complete()).not.toThrow();
    });

    it('should work in quiet mode', () => {
      const tracker = new ProgressTracker(['Step 1', 'Step 2'], { quiet: true });

      // Should not throw in quiet mode
      expect(() => tracker.nextStep()).not.toThrow();
      expect(() => tracker.updateText('Custom text')).not.toThrow();
      expect(() => tracker.complete('All done')).not.toThrow();
    });

    it('should handle failure', () => {
      const tracker = new ProgressTracker(['Step 1', 'Step 2']);

      tracker.nextStep();

      expect(() => tracker.fail('Something went wrong')).not.toThrow();
    });

    it('should support custom step text', () => {
      const tracker = new ProgressTracker(['Step 1', 'Step 2']);

      // Should not throw with custom text
      expect(() => tracker.nextStep('Custom: Step 1')).not.toThrow();
    });
  });
});
