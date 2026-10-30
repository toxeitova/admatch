import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RequestForm } from "@/components/RequestForm";
import { copy } from "@/lib/copy.ru";

export const metadata: Metadata = { title: copy.meta.requestTitle };

export default function RequestPage() {
  return (
    <>
      <Header showCta={false} />
      <main className="container-page max-w-2xl py-8 sm:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{copy.form.h1}</h1>
        <p className="mt-3 text-lg text-ink-muted">{copy.form.subtitle}</p>
        <div className="card mt-8 p-5 sm:p-8">
          <RequestForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
