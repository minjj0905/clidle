import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';
import { HINT, type Hint } from './hint.js';
import type { Attempt } from './game.js';

const HINT_EMOJI: Record<Hint, string> = {
  [HINT.EXACT]: '🟦',
  [HINT.PRESENT]: '🟪',
  [HINT.ABSENT]: '⬜',
};

/**
 * 오늘의 결과를 이모지 격자로 표현한 "결과 공유" 텍스트를 생성한다.
 * @example buildShareText(20260716, attempts, 6, true) // "CLIDLE 20260716 3/6\n\n🟨🟩..."
 */
export function buildShareText(
  seed: number,
  attempts: Attempt[],
  maxAttempts: number,
  won: boolean,
): string {
  const header = `CLIDLE ${seed} ${won ? attempts.length : 'X'}/${maxAttempts}`;
  const grid = attempts.map((attempt) => attempt.hint.map((h) => HINT_EMOJI[h]).join('')).join('\n');
  return `${header}\n\n${grid}`;
}

function clipboardCommand(): { cmd: string; args: string[] } {
  const os = platform();
  if (os === 'darwin') return { cmd: 'pbcopy', args: [] };
  if (os === 'win32') return { cmd: 'clip', args: [] };
  return { cmd: 'xclip', args: ['-selection', 'clipboard'] };
}

/**
 * 텍스트를 시스템 클립보드에 복사한다. 지원하지 않는 환경이면 false를 반환한다.
 */
export function copyToClipboard(text: string): boolean {
  try {
    const { cmd, args } = clipboardCommand();
    execFileSync(cmd, args, { input: text });
    return true;
  } catch {
    return false;
  }
}
