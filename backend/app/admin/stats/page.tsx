'use client';

import { useEffect, useState } from 'react';

interface DayStat {
  seed: number;
  display: string | null;
  slot: number;
  plays: number;
  wins: number;
  winRate: number;
}

interface StatsResponse {
  totalPlays: number;
  totalWins: number;
  winRate: number;
  perDay: DayStat[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then(setStats);
  }, []);

  if (!stats) return <p>불러오는 중...</p>;

  return (
    <div>
      <h1>통계</h1>
      <p>
        전체 {stats.totalPlays}회 플레이 · 정답 {stats.totalWins}회 · 정답률 {stats.winRate}%
      </p>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cellStyle}>날짜(시드)</th>
            <th style={cellStyle}>단어</th>
            <th style={cellStyle}>플레이</th>
            <th style={cellStyle}>정답</th>
            <th style={cellStyle}>정답률</th>
          </tr>
        </thead>
        <tbody>
          {stats.perDay.map((d) => (
            <tr key={d.seed}>
              <td style={cellStyle}>{d.seed}</td>
              <td style={cellStyle}>{d.display ?? '-'}</td>
              <td style={cellStyle}>{d.plays}</td>
              <td style={cellStyle}>{d.wins}</td>
              <td style={cellStyle}>{d.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle: React.CSSProperties = { border: '1px solid #444', padding: '4px 8px', textAlign: 'left' };
