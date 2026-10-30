"use client";

import Link from "next/link";
import { copy } from "@/lib/copy.ru";

export default function ResultsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container-page flex max-w-3xl flex-col items-center py-16 text-center">
      <p role="alert" className="text-lg font-semibold">
        {copy.errors.server}
      </p>
      <div className="mt-6 flex flex-col gap-3 xs:flex-row">
        <button type="button" onClick={reset} className="btn-primary">
          {copy.errors.retry}
        </button>
        <Link href="/" className="btn-secondary">
          {copy.nav.home}
        </Link>
      </div>
    </main>
  );
}
