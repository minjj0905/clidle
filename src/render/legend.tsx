import { Box, Text } from 'ink';
import { HINT } from '../hint.js';
import { HINT_COLOR } from './board.js';

export function Legend() {
  return (
    <Box marginBottom={1}>
      <Text color={HINT_COLOR[HINT.EXACT]} bold>
        ■ 정확
      </Text>
      <Text>{'  '}</Text>
      <Text color={HINT_COLOR[HINT.PRESENT]} bold>
        ■ 위치 오류
      </Text>
      <Text>{'  '}</Text>
      <Text color={HINT_COLOR[HINT.ABSENT]} bold>
        ■ 없음
      </Text>
    </Box>
  );
}
