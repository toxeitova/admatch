import Link from "next/link";
import { copy } from "@/lib/copy.ru";
import { Logo } from "./Logo";

export function Header({ showCta = true }: { showCta?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-page/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav className="flex items-center gap-3 sm:gap-5" aria-label="Основная навигация">
          <Link href="/#how" className="hidden text-sm font-semibold text-ink-muted hover:text-ink xs:inline">
            {copy.nav.how}
          </Link>
          {showCta && (
            <Link href="/request" className="btn-primary btn-sm">
              {copy.nav.cta}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
