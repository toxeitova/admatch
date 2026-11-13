import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cabinet, type CabinetData } from "@/components/creator/Cabinet";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getCreatorId } from "@/lib/creatorSession";
import { todayIsoAlmaty } from "@/lib/availability";
import { creatorActivity, getAvailability, getProfile, latestSubmission, statsAgeDays } from "@/lib/creatorData";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Кабинет блогера — AdMatch", robots: { index: false, follow: false } };

export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const creatorId = await getCreatorId();
  if (!creatorId) redirect("/creator/login");
  const profile = await getProfile(creatorId);
  if (!profile) redirect("/creator/login");
  const [submission, availability, activity] = await Promise.all([
    latestSubmission(creatorId),
    getAvailability(creatorId),
    creatorActivity(creatorId),
  ]);
  const data: CabinetData = {
    profile,
    submission: submission && {
      status: submission.status,
      admin_note: submission.admin_note,
      created_at: submission.created_at,
      values: {
        followers: submission.followers,
        almaty_share_pct: submission.almaty_share_pct,
        avg_reels_views: submission.avg_reels_views,
        stories_reach: submission.stories_reach,
        er_pct: submission.er_pct == null ? null : Number(submission.er_pct),
        audience_age_from: submission.audience_age_from,
        audience_age_to: submission.audience_age_to,
        audience_gender: submission.audience_gender,
      },
    },
    availability,
    activity,
    statsAgeDays: statsAgeDays(profile.data_checked_at),
    today: todayIsoAlmaty(),
    welcome: (await searchParams).welcome === "1",
  };
  return (
    <>
      <Header showCta={false} />
      <main className="container-page max-w-3xl py-8 sm:py-12">
        <Cabinet data={data} />
      </main>
      <Footer />
    </>
  );
}
