import { Box, Text } from 'ink';
import type { Hint } from '../hint.js';
import type { Attempt } from '../game.js';
import { ALL_CONSONANTS, ALL_VOWELS, computeKeyStatus } from '../keyboard.js';
import { HINT_COLOR } from './board.js';

interface KeyProps {
  jamo: string;
  hint?: Hint;
}

function Key({ jamo, hint }: KeyProps) {
  return (
    <Text color={hint ? HINT_COLOR[hint] : undefined} bold={Boolean(hint)}>
      {jamo}{' '}
    </Text>
  );
}

interface KeyboardProps {
  attempts: Attempt[];
}

export function Keyboard({ attempts }: KeyboardProps) {
  const status = computeKeyStatus(attempts);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        {ALL_CONSONANTS.map((jamo) => (
          <Key key={jamo} jamo={jamo} hint={status.get(jamo)} />
        ))}
      </Box>
      <Box>
        {ALL_VOWELS.map((jamo) => (
          <Key key={jamo} jamo={jamo} hint={status.get(jamo)} />
        ))}
      </Box>
    </Box>
  );
}
