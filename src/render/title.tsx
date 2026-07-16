import { Box, Text } from 'ink';
import { formatSeedDate } from '../seed.js';

const LOGO = [
  '  ██████╗██╗     ██╗██████╗ ██╗     ███████╗',
  ' ██╔════╝██║     ██║██╔══██╗██║     ██╔════╝',
  ' ██║     ██║     ██║██║  ██║██║     █████╗  ',
  ' ██║     ██║     ██║██║  ██║██║     ██╔══╝  ',
  ' ╚██████╗███████╗██║██████╔╝███████╗███████╗',
  '  ╚═════╝╚══════╝╚═╝╚═════╝╚══════╝╚══════╝',
].join('\n');

interface TitleProps {
  seed: number;
  slot: number;
  maxAttempts: number;
}

export function Title({ seed, slot, maxAttempts }: TitleProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyanBright">{LOGO}</Text>
      <Text dimColor>
        {formatSeedDate(seed)}  |  오늘의 슬롯: {slot}칸  |  시도: {maxAttempts}회
      </Text>
    </Box>
  );
}
