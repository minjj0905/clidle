export default function Home() {
  return (
    <div>
      <h1>CLIDLE 백엔드</h1>
      <p>
        API: <code>/api/today</code>, <code>/api/stats</code>
      </p>
      <p>
        관리자: <a href="/admin/words" style={{ color: '#6cf' }}>/admin/words</a>
      </p>
    </div>
  );
}
