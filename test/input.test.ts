import { describe, it, expect } from 'vitest';
import { RomanizationInput, keyToJamo } from '../src/input.js';

describe('keyToJamo', () => {
  it('자음 키를 자모로 변환한다', () => {
    expect(keyToJamo('r')).toBe('ㄱ');
    expect(keyToJamo('g')).toBe('ㅎ');
  });

  it('모음 키를 자모로 변환한다', () => {
    expect(keyToJamo('k')).toBe('ㅏ');
    expect(keyToJamo('l')).toBe('ㅣ');
  });

  it('매핑되지 않은 키는 null을 반환한다', () => {
    expect(keyToJamo('1')).toBeNull();
    expect(keyToJamo('!')).toBeNull();
  });
});

describe('RomanizationInput', () => {
  it('일반 자음/모음 입력을 순서대로 슬롯에 쌓는다', () => {
    const input = new RomanizationInput();
    input.pushKey('r'); // ㄱ
    input.pushKey('k'); // ㅏ
    input.pushKey('s'); // ㄴ
    input.pushKey('k'); // ㅏ
    expect(input.slots).toEqual(['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ']);
  });

  it('같은 자음을 두 번 연속 입력하면 쌍자음 슬롯 두 개가 쌓인다 (rr -> ㄱ, ㄱ)', () => {
    const input = new RomanizationInput();
    input.pushKey('r');
    input.pushKey('r');
    expect(input.slots).toEqual(['ㄱ', 'ㄱ']);
  });

  it('같은 자음을 세 번 입력하면 세 슬롯이 그대로 쌓인다', () => {
    const input = new RomanizationInput();
    input.pushKey('r');
    input.pushKey('r');
    input.pushKey('r');
    expect(input.slots).toEqual(['ㄱ', 'ㄱ', 'ㄱ']);
  });

  it('이중모음은 조합 없이 각각 별도 슬롯으로 쌓인다', () => {
    const input = new RomanizationInput();
    input.pushKey('h'); // ㅗ
    input.pushKey('k'); // ㅏ
    expect(input.slots).toEqual(['ㅗ', 'ㅏ']);
  });

  it('매핑되지 않은 키(IME 등)는 무시한다', () => {
    const input = new RomanizationInput();
    input.pushKey('r');
    input.pushKey('1');
    expect(input.slots).toEqual(['ㄱ']);
  });

  it('maxLength에 도달하면 추가 입력을 막는다', () => {
    const input = new RomanizationInput(2);
    input.pushKey('r');
    input.pushKey('k');
    input.pushKey('s');
    expect(input.slots).toEqual(['ㄱ', 'ㅏ']);
  });

  it('backspace로 마지막 슬롯을 지운다', () => {
    const input = new RomanizationInput();
    input.pushKey('r');
    input.pushKey('k');
    input.backspace();
    expect(input.slots).toEqual(['ㄱ']);
  });

  it('reset으로 슬롯을 초기화한다', () => {
    const input = new RomanizationInput();
    input.pushKey('r');
    input.reset();
    expect(input.slots).toEqual([]);
  });
});
