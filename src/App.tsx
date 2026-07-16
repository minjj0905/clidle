import { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Game, GAME_STATUS, type Attempt, type GameStatus } from './game.js';
import { RomanizationInput } from './input.js';
import type { WordsBySlot } from './types.js';
import { Title } from './render/title.js';
import { Board } from './render/board.js';
import { Result } from './render/result.js';

interface AppProps {
  words: WordsBySlot;
}

export function App({ words }: AppProps) {
  const { exit } = useApp();
  const [game] = useState(() => new Game({ words }));
  const [inputter] = useState(() => new RomanizationInput(game.slot));
  const [currentSlots, setCurrentSlots] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [status, setStatus] = useState<GameStatus>(GAME_STATUS.PLAYING);
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
