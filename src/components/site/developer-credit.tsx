import { existsSync } from 'node:fs';
import path from 'node:path';

const LOGO_FILES = ['zagrosian-logo.svg', 'zagrosian-logo.png', 'zagrosian-logo.webp'];

// The Zagrosian logo, when placed in public/brand/ (checked once at startup).
const logo = LOGO_FILES.find((file) => existsSync(path.join(process.cwd(), 'public', 'brand', file)));

/** "Ontworpen en ontwikkeld door Zagrosian", with the studio's logo and a link to zagrosian.com. */
export function DeveloperCredit() {
  return (
    <a
      href="https://zagrosian.com"
      target="_blank"
      rel="noopener"
      className="group inline-flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-paper/55 transition-colors hover:text-white"
      aria-label="Ontworpen en ontwikkeld door Zagrosian (zagrosian.com)"
    >
      <span className="whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.14em] sm:tracking-[0.18em]">Ontworpen en ontwikkeld door</span>
      <span className="hidden h-3.5 w-px bg-white/20 sm:block" aria-hidden="true" />
      <span className="inline-flex items-center gap-2.5">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- small static logo
          <img
            src={`/brand/${logo}`}
            alt=""
            width={30}
            height={31}
            className="h-[30px] w-auto opacity-80 transition-all duration-500 group-hover:rotate-[-6deg] group-hover:opacity-100"
          />
        )}
        <span className="text-[0.95rem] font-bold uppercase tracking-[0.28em] text-paper/80 transition-colors duration-300 group-hover:text-white sm:tracking-[0.32em]">
          Zagrosian
        </span>
      </span>
    </a>
  );
}
