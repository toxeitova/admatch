import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ResultsView } from "@/components/ResultsView";
import { copy } from "@/lib/copy.ru";
import { getResults } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: copy.meta.resultsTitle, robots: { index: false, follow: false } };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getResults(id);
  if (!data) notFound();

  return (
    <>
      <Header />
      <main className="container-page max-w-3xl py-8 sm:py-12">
        <ResultsView request={data.request} matches={data.matches} />
      </main>
      <Footer />
    </>
  );
}
