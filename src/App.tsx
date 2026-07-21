import { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Game, GAME_STATUS, type Attempt, type GameStatus } from './game.js';
import { RomanizationInput } from './input.js';
import { loadSavedState, saveState, loadStats, saveStats } from './storage.js';
import { recordResult, type Stats } from './stats.js';
import { buildShareText, copyToClipboard } from './share.js';
import { postStats } from './api.js';
import type { Hint } from './hint.js';
import { Title } from './render/title.js';
import { Board } from './render/board.js';
import { Result } from './render/result.js';
import { Legend } from './render/legend.js';
import { Keyboard } from './render/keyboard.js';

interface AppProps {
  remote: { seed: number; slot: number; maxAttempts: number; guessResolver: (guess: string[]) => Promise<Hint[]> };
  deviceId: string;
}

export function App({ remote, deviceId }: AppProps) {
  const { exit } = useApp();
  const [game] = useState(() => {
    const g = new Game({ remote });
    const saved = loadSavedState(g.seed);
    if (saved) {
      g.attempts = saved.attempts;
      g.status = saved.status;
    }
    return g;
  });
  const [inputter] = useState(() => new RomanizationInput(game.slot));
  const [currentSlots, setCurrentSlots] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>(() => [...game.attempts]);
  const [status, setStatus] = useState<GameStatus>(() => game.status);
  const [message, setMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<Stats>(() => {
    const loaded = loadStats();
    if (game.status === GAME_STATUS.PLAYING) return loaded;
    const updated = recordResult(loaded, game.seed, game.status === GAME_STATUS.WON, game.attempts.length);
    saveStats(updated);
    void postStats({
      deviceId,
      seed: game.seed,
      slot: game.slot,
      won: game.status === GAME_STATUS.WON,
      attemptCount: game.attempts.length,
    });
    return updated;
  });

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      return;
    }

    if (status !== GAME_STATUS.PLAYING) {
      if (input === 'c') {
        const text = buildShareText(game.seed, game.attempts, game.maxAttempts, status === GAME_STATUS.WON);
        const copied = copyToClipboard(text);
        setCopyMessage(copied ? '결과가 클립보드에 복사되었습니다! 📋' : '클립보드 복사에 실패했어요 (pbcopy/xclip 필요).');
      }
      return;
    }

    if (submitting) return;

    if (key.backspace || key.delete) {
      setCurrentSlots([...inputter.backspace()]);
      setMessage(null);
      return;
    }

    if (key.return) {
      if (currentSlots.length !== game.slot) {
        setMessage(`자모 ${game.slot}개를 모두 입력해주세요.`);
        return;
      }
      const guess = currentSlots;
      setSubmitting(true);
      setMessage('채점 중...');

      void (async () => {
        try {
          const result = await game.submitGuess(guess);
          setAttempts([...game.attempts]);
          setStatus(result.status);
          saveState({ seed: game.seed, attempts: game.attempts, status: result.status });
          if (result.status !== GAME_STATUS.PLAYING) {
            setStats((prev) => {
              const updated = recordResult(prev, game.seed, result.status === GAME_STATUS.WON, game.attempts.length);
              saveStats(updated);
              return updated;
            });
            void postStats({
              deviceId,
              seed: game.seed,
              slot: game.slot,
              won: result.status === GAME_STATUS.WON,
              attemptCount: game.attempts.length,
            });
          }
          inputter.reset();
          setCurrentSlots([]);
          setMessage(null);
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    setCurrentSlots([...inputter.pushKey(input)]);
  });

  return (
    <Box flexDirection="column">
      <Title seed={game.seed} slot={game.slot} maxAttempts={game.maxAttempts} />
      <Legend />
      <Board
        attempts={attempts}
        currentSlots={currentSlots}
        slot={game.slot}
        maxAttempts={game.maxAttempts}
        isPlaying={status === GAME_STATUS.PLAYING}
      />
      {message && (
        <Text color="red" dimColor>
          {message}
        </Text>
      )}
      <Keyboard attempts={attempts} />
      {status !== GAME_STATUS.PLAYING && (
        <Result status={status} maxAttempts={game.maxAttempts} stats={stats} copyMessage={copyMessage} />
      )}
    </Box>
  );
}
