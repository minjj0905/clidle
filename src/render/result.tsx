import { Box, Text } from 'ink';
import { GAME_STATUS, type GameStatus } from '../game.js';
import type { WordEntry } from '../types.js';

interface ResultProps {
  status: GameStatus;
  answer: WordEntry;
}

export function Result({ status, answer }: ResultProps) {
  const won = status === GAME_STATUS.WON;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color={won ? 'cyanBright' : 'red'}>
        {won ? '정답입니다! 🎉' : '아쉬워요, 오늘은 실패!'}
      </Text>
      <Text>
        오늘의 단어: <Text bold>{answer.display}</Text>
      </Text>
      <Text dimColor>(esc 또는 q를 눌러 종료)</Text>
    </Box>
  );
}
