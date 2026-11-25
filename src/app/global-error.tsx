'use client';

/**
 * Последний рубеж: ошибка в корневом layout. Глобальные стили здесь недоступны,
 * поэтому оформление минимальное и встроенное (палитра Mezon).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#121212', color: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
        <title>Sprint OS временно недоступен</title>
        <main style={{ maxWidth: 440, padding: 24, borderLeft: '6px solid #a04a84' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Sprint OS временно недоступен</h1>
          <p style={{ margin: '0 0 20px', opacity: 0.75, lineHeight: 1.6 }}>
            Записи в безопасности. Обновите страницу через минуту.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: '#fcd5a6', color: '#121212', border: 0, padding: '12px 20px', fontWeight: 800, cursor: 'pointer' }}
          >
            Обновить
          </button>
        </main>
      </body>
    </html>
  );
}
