import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { IconSearch } from "@/components/Icons";
import { copy } from "@/lib/copy.ru";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container-page flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <IconSearch className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold">{copy.notFound.title}</h1>
        <p className="mt-3 max-w-md text-ink-muted">{copy.notFound.text}</p>
        <Link href="/request" className="btn-primary mt-8">
          {copy.nav.cta}
        </Link>
      </main>
      <Footer />
    </>
  );
}
