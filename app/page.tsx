import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RecentResults } from "@/components/RecentResults";
import { IconArrowRight, IconBadgeCheck, IconHandshake, IconPin, IconTag } from "@/components/Icons";
import { copy } from "@/lib/copy.ru";

const WHY_ICONS = [IconBadgeCheck, IconPin, IconTag, IconHandshake];
const t = copy.home;

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="container-page pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="max-w-3xl">
            <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t.h1}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted sm:text-xl">{t.subtitle}</p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <Link href="/request" className="btn-primary w-full px-7 text-lg xs:w-auto">
                {t.cta}
                <IconArrowRight />
              </Link>
              <p className="text-sm text-ink-faint">{t.ctaNote}</p>
              <Link href="/creator/join" className="btn-secondary mt-2 w-full xs:w-auto">
                Я блогер — разместить профиль
              </Link>
            </div>
            <RecentResults className="mt-8 max-w-xl" />
          </div>
        </section>

        {/* Как это работает */}
        <section id="how" className="scroll-mt-20 bg-white py-14 sm:py-20">
          <div className="container-page">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.howTitle}</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {t.how.map((step, i) => (
                <li key={step.title} className="rounded-card border border-line bg-page p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-lg font-extrabold text-accent-ink">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Почему AdMatch */}
        <section className="py-14 sm:py-20">
          <div className="container-page">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.whyTitle}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {t.why.map((item, i) => {
                const Icon = WHY_ICONS[i];
                return (
                  <div key={item.title} className="card p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 leading-relaxed text-ink-muted">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Финальный CTA */}
        <section className="container-page pb-16">
          <div className="rounded-card bg-ink px-6 py-10 text-center text-white sm:px-12 sm:py-14">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.finalTitle}</h2>
            <Link href="/request" className="btn-primary mt-6 w-full px-7 text-lg xs:w-auto">
              {t.finalCta}
              <IconArrowRight />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
