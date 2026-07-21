/** 자모 배열들을 빠른 조회를 위한 Set으로 변환한다. */
export function buildDictionary(jamoList: string[][]): Set<string> {
  return new Set(jamoList.map((jamo) => jamo.join('')));
}

/** 입력한 자모 배열이 사전(오늘의 슬롯에 해당하는 유효 단어 목록)에 있는지 확인한다. */
export function isValidGuess(jamoArray: string[], dictionary: Set<string>): boolean {
  return dictionary.has(jamoArray.join(''));
}
