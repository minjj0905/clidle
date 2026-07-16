import { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Game, GAME_STATUS, type Attempt, type GameStatus } from './game.js';
import { RomanizationInput } from './input.js';
import { loadSavedState, saveState } from './storage.js';
import type { WordsBySlot } from './types.js';
import { Title } from './render/title.js';
import { Board } from './render/board.js';
import { Result } from './render/result.js';
import { Legend } from './render/legend.js';

interface AppProps {
  words: WordsBySlot;
}

export function App({ words }: AppProps) {
  const { exit } = useApp();
  const [game] = useState(() => {
    const g = new Game({ words });
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

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    if (status !== GAME_STATUS.PLAYING) return;

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
      const result = game.submitGuess(currentSlots);
      setAttempts([...game.attempts]);
      setStatus(result.status);
      saveState({ seed: game.seed, attempts: game.attempts, status: result.status });
      inputter.reset();
      setCurrentSlots([]);
      setMessage(null);
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
      {status !== GAME_STATUS.PLAYING && <Result status={status} answer={game.answer} />}
    </Box>
  );
}
