import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type User = { id: number; username: string };

async function getBaseUrl() {
  // Если задано env — используем
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl;

  // Иначе собираем из текущего запроса (локально/верчел)
  const h = await headers(); // важно: await (на новых Next это Promise)
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function ProfilePage() {
  const cookieHeader = (await cookies()).toString(); // важно: await
  const baseUrl = await getBaseUrl();

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  const user: User | null = data?.user ?? null;

  if (!user) redirect("/");

  const ProfileClient = (await import("./profile-client")).default;
  return <ProfileClient user={user} />;
}
