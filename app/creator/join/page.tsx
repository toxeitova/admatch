import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JoinForm } from "@/components/creator/JoinForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCreatorId } from "@/lib/creatorSession";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Регистрация блогера — AdMatch" };

export default async function JoinPage() {
  if (await getCreatorId()) redirect("/creator");
  return (
    <>
      <Header />
      <main className="container-page max-w-xl py-8 sm:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Кабинет блогера</h1>
        <p className="mt-3 text-lg text-ink-muted">
          Добавьте профиль, статистику и цены. После проверки вас увидят бизнесы Алматы, которые ищут блогеров.
        </p>
        <div className="mt-6">
          <JoinForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
