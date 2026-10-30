import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { copy } from "@/lib/copy.ru";

export const metadata: Metadata = { title: copy.meta.termsTitle };

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="container-page max-w-3xl py-10 sm:py-14">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{copy.terms.h1}</h1>
        <ol className="mt-8 space-y-4">
          {copy.terms.sections.map((s, i) => (
            <li key={s.title} className="card p-6">
              <h2 className="text-lg font-bold">
                {i + 1}. {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-ink-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </>
  );
}
