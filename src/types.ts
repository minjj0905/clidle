export interface WordEntry {
  display: string;
  jamo: string[];
  slot: number;
}

export type WordsBySlot = Record<number, WordEntry[]>;
