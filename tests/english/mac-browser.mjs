// Test runner only: remote/locked macOS desktops can stop compositor frames.
// Keep real pointer input, normal timeouts, visibility checks and all assertions.
// Linux CI runs the original browser harnesses without this bootstrap.
import { chromium } from '@playwright/test';

if (process.platform === 'darwin') {
  const launch = chromium.launch.bind(chromium);
  chromium.launch = (options = {}) => launch({
    ...options,
    args: [
      ...(options.args ?? []),
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
    ],
  });
}
