import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { HINT } from '../src/hint.js';
import { Keyboard } from '../src/render/keyboard.js';

describe('Keyboard', () => {
  it('입력 전에는 자음/모음 24개를 모두 표시한다', () => {
    const { lastFrame } = render(<Keyboard attempts={[]} />);
    const frame = lastFrame();
    expect(frame).toContain('ㄱ');
    expect(frame).toContain('ㅎ');
    expect(frame).toContain('ㅏ');
    expect(frame).toContain('ㅣ');
  });

  it('시도 결과를 반영해 렌더링한다', () => {
    const { lastFrame } = render(
      <Keyboard attempts={[{ guess: ['ㄱ', 'ㅏ'], hint: [HINT.EXACT, HINT.ABSENT] }]} />,
    );
    expect(lastFrame()).toContain('ㄱ');
  });
});
