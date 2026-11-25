'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

/** Сбой рендеринга раздела: данные в базе целы, экран можно перезапустить. */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error('Sprint OS UI error:', error);
  }, [error]);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <main className="mz-sys">
      <div className="mz-sys__card">
        <Image src="/brand/adm.png" alt="" width={200} height={222} className="mz-sys__mascot" />
        <div>
          <span className="mz-tag mz-tag--peach">Сбой интерфейса</span>
          <h1>
            Что-то пошло <span className="mz-hl mz-hl--magenta">не так</span>
          </h1>
          <p>
            Записи сохранены на сервере — потерялся только этот экран. Попробуйте открыть его снова; если ошибка повторится,
            сообщите куратору{digest ? <> код <code>{digest}</code></> : null}.
          </p>
          <div className="mz-row">
            <button type="button" className="mz-btn mz-btn--primary" onClick={() => retry()}>
              Повторить
            </button>
            <Link href="/" className="mz-link mz-link--inverse">
              На главную
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
