'use client';

import { useEffect, useState } from 'react';

interface WordRow {
  id: number;
  display: string;
  jamo: string[];
  slot: number;
  is_active: boolean;
}

export default function WordsPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/words?${params.toString()}`);
    const body = await res.json();
    if (res.ok) setWords(body.words);
  }

  useEffect(() => {
    load();
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

  async function remove(word: WordRow) {
    if (!confirm(`"${word.display}"를 삭제할까요?`)) return;
    await fetch(`/api/admin/words/${word.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1>단어 관리</h1>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="새 단어 (한글, 자모 5~7개)"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
        />
        <button type="submit" disabled={loading}>추가</button>
      </form>
      {error && <p style={{ color: '#f66' }}>{error}</p>}

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
            <th style={cellStyle}></th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => (
            <tr key={w.id}>
              <td style={cellStyle}>{w.display}</td>
              <td style={cellStyle}>{w.slot}</td>
              <td style={cellStyle}>
                <button onClick={() => toggleActive(w)}>{w.is_active ? '활성' : '비활성'}</button>
              </td>
              <td style={cellStyle}>
                <button onClick={() => remove(w)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = { border: '1px solid #444', padding: '4px 8px', textAlign: 'left' };
