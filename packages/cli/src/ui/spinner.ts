import ora, { type Ora } from 'ora';

export interface SpinnerOptions {
  /** Whether to show spinner (false in quiet mode) */
  enabled?: boolean;
  /** Text to display while spinning */
  text?: string;
}

/**
 * Creates a spinner that respects quiet mode.
 * In quiet mode, returns a no-op spinner.
 */
export function createSpinner(options: SpinnerOptions = {}): Ora {
  const { enabled = true, text } = options;

  if (!enabled) {
    // Return a no-op spinner for quiet mode
    return {
      start: () => noopSpinner,
      stop: () => noopSpinner,
      succeed: () => noopSpinner,
      fail: () => noopSpinner,
      warn: () => noopSpinner,
      info: () => noopSpinner,
      stopAndPersist: () => noopSpinner,
      clear: () => noopSpinner,
      render: () => noopSpinner,
      frame: () => '',
      text: '',
      prefixText: '',
      suffixText: '',
      color: 'cyan',
      indent: 0,
      spinner: { interval: 80, frames: ['-'] },
      isSpinning: false,
    } as unknown as Ora;
  }

  return ora({ text });
}

const noopSpinner = {
  start: () => noopSpinner,
  stop: () => noopSpinner,
  succeed: () => noopSpinner,
  fail: () => noopSpinner,
  warn: () => noopSpinner,
  info: () => noopSpinner,
  stopAndPersist: () => noopSpinner,
  clear: () => noopSpinner,
  render: () => noopSpinner,
  frame: () => '',
  text: '',
  prefixText: '',
  suffixText: '',
  color: 'cyan' as const,
  indent: 0,
  spinner: { interval: 80, frames: ['-'] },
  isSpinning: false,
};

/**
 * Run an async operation with a spinner.
 * Spinner shows during the operation and stops on success/failure.
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  options: { quiet?: boolean; successText?: string; failText?: string } = {}
): Promise<T> {
  const spinner = createSpinner({
    enabled: !options.quiet,
    text,
  });

  spinner.start();

  try {
    const result = await operation();
    if (options.successText) {
      spinner.succeed(options.successText);
    } else {
      spinner.stop();
    }
    return result;
  } catch (error) {
    if (options.failText) {
      spinner.fail(options.failText);
    } else {
      spinner.stop();
    }
    throw error;
  }
}

/**
 * Progress tracker for multi-step operations.
 */
export class ProgressTracker {
  private current = 0;
  private spinner: Ora;
  private readonly enabled: boolean;

  constructor(
    private readonly steps: string[],
    options: { quiet?: boolean } = {}
  ) {
    this.enabled = !options.quiet;
    this.spinner = createSpinner({ enabled: this.enabled });
  }

  /**
   * Advance to the next step.
   */
  nextStep(customText?: string): void {
    if (this.current > 0 && this.enabled) {
      this.spinner.succeed(this.steps[this.current - 1]);
    }

    if (this.current < this.steps.length) {
      const text = customText ?? `[${this.current + 1}/${this.steps.length}] ${this.steps[this.current]}`;
      this.spinner.text = text;
      if (!this.spinner.isSpinning && this.enabled) {
        this.spinner.start();
      }
      this.current++;
    }
  }

  /**
   * Mark current step as completed and finish tracking.
   */
  complete(successText?: string): void {
    if (this.enabled) {
      this.spinner.succeed(successText ?? this.steps[this.current - 1]);
    }
  }

  /**
   * Mark current step as failed and stop tracking.
   */
  fail(errorText?: string): void {
    if (this.enabled) {
      this.spinner.fail(errorText ?? `Failed: ${this.steps[this.current - 1]}`);
    }
  }

  /**
   * Update the current step text without advancing.
   */
  updateText(text: string): void {
    if (this.enabled) {
      this.spinner.text = text;
    }
  }
}
