import { Header } from "@/components/Header";
import { ResultsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="container-page max-w-3xl py-8 sm:py-12">
        <ResultsSkeleton />
      </main>
    </>
  );
}
