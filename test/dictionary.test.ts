import { describe, it, expect } from 'vitest';
import { buildDictionary, isValidGuess } from '../src/dictionary.js';

describe('dictionary', () => {
  const dictionary = buildDictionary([
    ['ㄱ', 'ㅏ', 'ㅇ', 'ㅡ', 'ㄹ'],
    ['ㅌ', 'ㅗ', 'ㄱ', 'ㄱ', 'ㅣ'],
  ]);

  it('사전에 있는 자모 조합은 유효하다', () => {
    expect(isValidGuess(['ㄱ', 'ㅏ', 'ㅇ', 'ㅡ', 'ㄹ'], dictionary)).toBe(true);
  });

  it('사전에 없는 자모 조합은 무효하다', () => {
    expect(isValidGuess(['ㄱ', 'ㄱ', 'ㄱ', 'ㄱ', 'ㄱ'], dictionary)).toBe(false);
  });
});
