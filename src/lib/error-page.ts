export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>โหลดหน้านี้ไม่สำเร็จ</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 "IBM Plex Sans Thai", system-ui, -apple-system, sans-serif; background: #0a0e1a; color: #f4f4f5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #94a3b8; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #f59e0b; color: #0a0e1a; }
      .secondary { background: #151b2e; color: #f4f4f5; border-color: #1e293b; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>โหลดหน้านี้ไม่สำเร็จ</h1>
      <p>เกิดข้อผิดพลาดที่ฝั่งเซิร์ฟเวอร์ ลองรีเฟรชหรือกลับหน้าหลัก</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">ลองอีกครั้ง</button>
        <a class="secondary" href="/">กลับหน้าหลัก</a>
      </div>
    </div>
  </body>
</html>`;
}
