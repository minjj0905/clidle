import { Box, Text } from 'ink';
import { HINT, type Hint } from '../hint.js';
import type { Attempt } from '../game.js';

// NYT Wordle의 초록/노랑/회색 3색 조합을 피하고 청록/자홍/회색 계열을 사용한다.
const HINT_COLOR: Record<Hint, string> = {
  [HINT.EXACT]: 'cyanBright',
  [HINT.PRESENT]: 'magentaBright',
  [HINT.ABSENT]: 'gray',
};

interface CellProps {
  jamo: string;
  color?: string;
}

function Cell({ jamo, color }: CellProps) {
  return (
    <Text color={color} bold={Boolean(color)}>
      [ {jamo} ]
    </Text>
  );
}

interface BoardProps {
  attempts: Attempt[];
  currentSlots: string[];
  slot: number;
  maxAttempts: number;
  isPlaying: boolean;
}

export function Board({ attempts, currentSlots, slot, maxAttempts, isPlaying }: BoardProps) {
  return (
    <Box flexDirection="column">
      {attempts.map((attempt, rowIndex) => (
        <Box key={rowIndex}>
          <Text dimColor>
            시도 {rowIndex + 1}/{maxAttempts}{'  '}
          </Text>
          {attempt.guess.map((jamo, i) => (
            <Cell key={i} jamo={jamo} color={HINT_COLOR[attempt.hint[i] as Hint]} />
          ))}
        </Box>
      ))}
      {isPlaying && (
        <Box>
          <Text>
            시도 {attempts.length + 1}/{maxAttempts}{'  '}
          </Text>
          {Array.from({ length: slot }).map((_, i) => (
            <Cell key={i} jamo={currentSlots[i] ?? ' '} />
          ))}
        </Box>
      )}
    </Box>
  );
}
