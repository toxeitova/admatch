// Скелетоны для состояния загрузки подборки.
import { copy } from "@/lib/copy.ru";
export function CardSkeleton() {
  return (
    <div className="card p-5 sm:p-6" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="skeleton h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="skeleton h-7 w-28 rounded-full" />
        <div className="skeleton h-7 w-24 rounded-full" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16" />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-3/4" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="skeleton h-12" />
        <div className="skeleton h-12" />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{copy.errors.loading}</span>
      <div className="skeleton h-9 w-4/5" />
      <div className="skeleton mt-3 h-4 w-full" />
      <div className="skeleton mt-2 h-4 w-2/3" />
      <div className="mt-5 flex flex-wrap gap-2">
        <div className="skeleton h-7 w-32 rounded-full" />
        <div className="skeleton h-7 w-36 rounded-full" />
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>
      <div className="mt-8 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
