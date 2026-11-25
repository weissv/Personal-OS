import Image from 'next/image';
import Link from 'next/link';

export const metadata = { title: 'Страница не найдена' };

export default function NotFound() {
  return (
    <main className="mz-sys">
      <div className="mz-sys__card">
        <Image src="/brand/art.png" alt="" width={200} height={222} className="mz-sys__mascot" priority />
        <div>
          <span className="mz-tag mz-tag--peach">Ошибка 404</span>
          <h1>
            Такой страницы <span className="mz-hl">нет</span>
          </h1>
          <p>Ссылка устарела или в адресе опечатка. Дневник, спринт и все твои записи — на главной.</p>
          <div className="mz-row">
            <Link href="/" className="mz-btn mz-btn--primary">
              На главную
            </Link>
            <a href="https://mezon.uz/" className="mz-link mz-link--inverse" target="_blank" rel="noopener noreferrer">
              Сайт школы mezon.uz
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
