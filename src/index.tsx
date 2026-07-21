#!/usr/bin/env node
import { render, Text } from 'ink';
import { App } from './App.js';
import { fetchToday, submitGuess } from './api.js';
import { getOrCreateDeviceId } from './storage.js';

async function main() {
  try {
    const deviceId = getOrCreateDeviceId();
    const today = await fetchToday();
    render(
      <App
        remote={{
          seed: today.seed,
          slot: today.slot,
          maxAttempts: today.maxAttempts,
          guessResolver: async (guess) => {
            const result = await submitGuess(today.seed, guess, deviceId);
            return result.hint;
          },
        }}
        deviceId={deviceId}
      />,
    );
  } catch (err) {
    render(<Text color="red">{(err as Error).message}</Text>);
    process.exitCode = 1;
  }
}

main();
