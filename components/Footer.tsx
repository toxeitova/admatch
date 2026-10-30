import Link from "next/link";
import { copy } from "@/lib/copy.ru";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line/70">
      <div className="container-page flex flex-col gap-2 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{copy.footer.copyright}</span>
        <Link href="/terms" className="font-semibold underline-offset-4 hover:text-ink hover:underline">
          {copy.footer.terms}
        </Link>
      </div>
    </footer>
  );
}
