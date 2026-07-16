import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { GAME_STATUS, type GameStatus } from '../game.js';
import type { WordEntry } from '../types.js';
import type { Stats } from '../stats.js';
import { winRate } from '../stats.js';
import { getMsUntilNextSeed } from '../seed.js';

interface ResultProps {
  status: GameStatus;
  answer: WordEntry;
  maxAttempts: number;
  stats: Stats;
  copyMessage: string | null;
}

const BAR_WIDTH = 20;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function DistributionRow({ label, count, max }: { label: string; count: number; max: number }) {
  const filled = max > 0 ? Math.round((count / max) * BAR_WIDTH) : 0;
  return (
    <Text>
      {label}  <Text color="cyanBright">{'█'.repeat(filled) || '·'}</Text> {count}
    </Text>
  );
}

export function Result({ status, answer, maxAttempts, stats, copyMessage }: ResultProps) {
  const won = status === GAME_STATUS.WON;
  const [msLeft, setMsLeft] = useState(() => getMsUntilNextSeed());

  useEffect(() => {
    const timer = setInterval(() => setMsLeft(getMsUntilNextSeed()), 1000);
    return () => clearInterval(timer);
  }, []);

  const distributionCounts = Array.from({ length: maxAttempts }, (_, i) => stats.distribution[i + 1] ?? 0);
  const maxCount = Math.max(1, ...distributionCounts);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color={won ? 'cyanBright' : 'red'}>
        {won ? '정답입니다! 🎉' : '아쉬워요, 오늘은 실패!'}
      </Text>
      <Text>
        오늘의 단어: <Text bold>{answer.display}</Text>
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>통계</Text>
        <Text>
          전체 도전 {stats.totalPlayed}  정답률 {winRate(stats)}%  현재 연속 {stats.currentStreak}  최다 연속{' '}
          {stats.maxStreak}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {distributionCounts.map((count, i) => (
            <DistributionRow key={i} label={String(i + 1)} count={count} max={maxCount} />
          ))}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>새로운 문제까지 {formatCountdown(msLeft)}</Text>
        <Text dimColor>(c: 결과 복사 · esc/q: 종료)</Text>
        {copyMessage && <Text color="cyanBright">{copyMessage}</Text>}
      </Box>
    </Box>
  );
}
