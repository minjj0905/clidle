import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { GAME_STATUS } from '../src/game.js';
import { EMPTY_STATS, recordResult } from '../src/stats.js';
import { Result } from '../src/render/result.js';

describe('Result', () => {
  it('승리 화면과 통계, 복사 안내를 렌더링하되 정답 단어는 알려주지 않는다', () => {
    const stats = recordResult(EMPTY_STATS, 20260716, true, 3);
    const { lastFrame } = render(<Result status={GAME_STATUS.WON} maxAttempts={6} stats={stats} copyMessage={null} />);

    const frame = lastFrame();
    expect(frame).toContain('정답입니다');
    expect(frame).toContain('통계');
    expect(frame).toContain('c: 결과 복사');
    expect(frame).not.toContain('오늘의 단어');
  });

  it('복사 완료 메시지를 표시한다', () => {
    const { lastFrame } = render(
      <Result
        status={GAME_STATUS.LOST}
        maxAttempts={6}
        stats={EMPTY_STATS}
        copyMessage="결과가 클립보드에 복사되었습니다! 📋"
      />,
    );

    expect(lastFrame()).toContain('복사되었습니다');
  });
});
