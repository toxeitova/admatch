import Link from "next/link";
import { copy } from "@/lib/copy.ru";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-baseline text-xl font-extrabold tracking-tight text-ink" aria-label={copy.brand}>
      AdMatch
      <span aria-hidden className="ml-0.5 inline-block h-2 w-2 rounded-full bg-accent" />
    </Link>
  );
}
