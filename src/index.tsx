#!/usr/bin/env node
import { render, Text } from 'ink';
import { App } from './App.js';
import { fetchTodayWord } from './api.js';

async function main() {
  try {
    const today = await fetchTodayWord();
    render(
      <App
        remote={{
          seed: today.seed,
          slot: today.slot,
          answer: { display: today.display, jamo: today.jamo, slot: today.slot },
          maxAttempts: today.maxAttempts,
        }}
      />,
    );
  } catch (err) {
    render(<Text color="red">{(err as Error).message}</Text>);
    process.exitCode = 1;
  }
}

main();
