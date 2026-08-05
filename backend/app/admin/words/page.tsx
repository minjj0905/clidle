'use client';

import { useCallback, useEffect, useState } from 'react';
import { isAnswerEligible, validateAnswerWord } from '../../../lib/answer-eligibility';

interface WordRow {
  id: number;
  display: string;
  jamo: string[];
  slot: number;
  is_active: boolean;
  is_answer_pool: boolean;
}

interface Daily {
  seed: number;
  slot: number;
  wordId: number | null;
  display: string | null;
  poolCount: number;
}

export default function WordsPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [daily, setDaily] = useState<Daily | null>(null);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/words?${params.toString()}`);
    const body = await res.json();
    if (res.ok) setWords(body.words);
  }, [search]);

  const loadDaily = useCallback(async () => {
    const res = await fetch('/api/admin/daily');
    const body = await res.json();
    if (res.ok) setDaily(body);
  }, []);

  useEffect(() => {
    load();
    loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch('/api/admin/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display: newWord.trim() }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setNewWord('');
    load();
  }

  async function toggleActive(word: WordRow) {
    await fetch(`/api/admin/words/${word.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !word.is_active }),
    });
    load();
  }

  async function toggleAnswerPool(word: WordRow) {
    await fetch(`/api/admin/words/${word.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAnswerPool: !word.is_answer_pool }),
    });
    load();
  }

  async function remove(word: WordRow) {
    if (!confirm(`"${word.display}"를 삭제할까요?`)) return;
    await fetch(`/api/admin/words/${word.id}`, { method: 'DELETE' });
    load();
  }

  /** wordId를 주면 그 단어로, 없으면 정답 풀에서 무작위로 오늘의 정답을 교체한다. */
  async function replaceDaily(word?: WordRow) {
    if (!daily) return;

    // 서버에서도 같은 규칙으로 다시 검증하지만, 눌러보기 전에 사유를 알려주려고 여기서 먼저 본다.
    if (word) {
      const invalid = validateAnswerWord(word, daily.slot);
      if (invalid) {
        setError(invalid);
        return;
      }
    }

    const target = word ? `"${word.display}"(으)로` : '무작위로';
    if (!confirm(`오늘(${daily.seed})의 정답을 ${target} 교체할까요?\n이미 오늘 문제를 푼 사용자에게는 정답이 바뀌어 보입니다.`)) return;

    setError(null);
    setNotice(null);
    setReplacing(true);
    const res = await fetch('/api/admin/daily', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(word ? { wordId: word.id } : {}),
    });
    const body = await res.json();
    setReplacing(false);
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setDaily({ ...daily, wordId: body.wordId, display: body.display });
    setNotice(word ? `오늘의 정답을 "${body.display}"(으)로 교체했습니다.` : '오늘의 정답을 무작위로 교체했습니다.');
  }

  return (
    <div>
      <h1>단어 관리</h1>

      <section style={sectionStyle}>
        <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>오늘의 문제</h2>
        {!daily ? (
          <p style={{ margin: 0 }}>불러오는 중...</p>
        ) : (
          <>
            <p style={{ margin: '0 0 8px' }}>
              시드 {daily.seed} · 슬롯 {daily.slot} · 정답 후보 {daily.poolCount}개 · 현재 정답{' '}
              {daily.display === null ? (
                <em>아직 미확정 (첫 요청 때 결정)</em>
              ) : revealAnswer ? (
                <strong>{daily.display}</strong>
              ) : (
                <button onClick={() => setRevealAnswer(true)}>보기</button>
              )}
            </p>
            <button onClick={() => replaceDaily()} disabled={replacing}>
              {replacing ? '교체 중...' : '무작위로 교체'}
            </button>
            <span style={{ marginLeft: 8, color: '#999', fontSize: 13 }}>
              아래 목록의 &quot;오늘 정답으로&quot; 버튼으로 단어를 직접 지정할 수도 있습니다.
            </span>
          </>
        )}
      </section>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="새 단어 (한글, 자모 5~7개)"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
        />
        <button type="submit" disabled={loading}>추가</button>
      </form>
      {error && <p style={{ color: '#f66' }}>{error}</p>}
      {notice && <p style={{ color: '#6c6' }}>{notice}</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); load(); }}
        style={{ display: 'flex', gap: 8, marginBottom: 16 }}
      >
        <input placeholder="검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit">검색</button>
      </form>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cellStyle}>단어</th>
            <th style={cellStyle}>슬롯</th>
            <th style={cellStyle}>활성</th>
            <th style={cellStyle}>정답 풀</th>
            <th style={cellStyle}>정답 가능</th>
            <th style={cellStyle}></th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => {
            const reason = daily ? validateAnswerWord(w, daily.slot) : '오늘의 문제를 불러오는 중입니다.';
            return (
              <tr key={w.id}>
                <td style={cellStyle}>{w.display}</td>
                <td style={cellStyle}>{w.slot}</td>
                <td style={cellStyle}>
                  <button onClick={() => toggleActive(w)}>{w.is_active ? '활성' : '비활성'}</button>
                </td>
                <td style={cellStyle}>
                  <button onClick={() => toggleAnswerPool(w)}>{w.is_answer_pool ? '정답 풀' : '입력 전용'}</button>
                </td>
                <td style={{ ...cellStyle, color: isAnswerEligible(w) ? '#6c6' : '#f66' }}>
                  {isAnswerEligible(w) ? '가능' : '불가'}
                </td>
                <td style={cellStyle}>
                  <button
                    onClick={() => replaceDaily(w)}
                    disabled={replacing || reason !== null || w.id === daily?.wordId}
                    title={w.id === daily?.wordId ? '이미 오늘의 정답입니다.' : reason ?? ''}
                  >
                    오늘 정답으로
                  </button>{' '}
                  <button onClick={() => remove(w)}>삭제</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = { border: '1px solid #444', padding: '4px 8px', textAlign: 'left' };
const sectionStyle: React.CSSProperties = { border: '1px solid #444', padding: 12, marginBottom: 16 };
