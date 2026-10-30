import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Automatically unmount and clean up the rendered DOM after each test.
 * This prevents state leaking between test cases.
 */
afterEach(() => {
  cleanup();
});
