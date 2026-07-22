#!/usr/bin/env node
import { render, Text } from 'ink';
import { App } from './App.js';
import { fetchToday, submitGuess } from './api.js';
import { getOrCreateDeviceId, loadConfig, loadSavedState, saveConfig } from './storage.js';
import { getDateSeed } from './seed.js';

/**
 * 네트워크 호출 없이 로컬 상태만 보고 오늘 문제를 풀었는지 확인한다.
 * 쉘 시작 훅 등에서 빠르게 호출하기 위한 용도(`clidle status`).
 * `clidle nudge off`로 끈 경우에는 아무것도 출력하지 않는다.
 */
function printStatus(): void {
  if (!loadConfig().nudgeEnabled) return;
  const seed = getDateSeed();
  const saved = loadSavedState(seed);
  if (!saved || saved.status === 'playing') {
    process.stdout.write('🟨 오늘의 CLIDLE, 아직 안 풀었어요! npx clidle 로 도전해보세요.\n');
  }
}

function setNudge(enabled: boolean): void {
  saveConfig({ nudgeEnabled: enabled });
  process.stdout.write(
    enabled ? '오늘의 문제 알림을 켰어요.\n' : '오늘의 문제 알림을 껐어요. (`clidle nudge on`으로 다시 켤 수 있어요)\n',
  );
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command === 'status') {
    printStatus();
    return;
  }
  if (command === 'nudge') {
    if (arg === 'on') return setNudge(true);
    if (arg === 'off') return setNudge(false);
    process.stdout.write('사용법: clidle nudge on | off\n');
    return;
  }
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
