import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { isAdmin } from "@/lib/auth";
import { cabinetCreators, pendingSubmissions, staleCreators } from "@/lib/creatorData";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Админка — AdMatch", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="container-page py-16">
        <AdminLogin />
      </main>
    );
  }
  const [pending, stale, creators] = await Promise.all([pendingSubmissions(), staleCreators(), cabinetCreators()]);
  return (
    <main className="container-page max-w-5xl py-10">
      <AdminPanel pending={pending} stale={stale} creators={creators} />
    </main>
  );
}
