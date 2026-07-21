#!/usr/bin/env node
import { render, Text } from 'ink';
import { App } from './App.js';
import { fetchToday, submitGuess } from './api.js';

async function main() {
  try {
    const today = await fetchToday();
    render(
      <App
        remote={{
          seed: today.seed,
          slot: today.slot,
          maxAttempts: today.maxAttempts,
          guessResolver: async (guess) => {
            const result = await submitGuess(today.seed, guess);
            return result.hint;
          },
        }}
      />,
    );
  } catch (err) {
    render(<Text color="red">{(err as Error).message}</Text>);
    process.exitCode = 1;
  }
}

main();
