import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/creator/LoginForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCreatorId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Вход для блогеров — AdMatch" };

export default async function LoginPage() {
  if (await getCreatorId()) redirect("/creator");
  return (
    <>
      <Header />
      <main className="container-page max-w-xl py-8 sm:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Вход для блогеров</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
