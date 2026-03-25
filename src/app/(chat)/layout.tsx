import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnlineTracker } from "@/components/online-tracker";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <OnlineTracker />
      {children}
    </div>
  );
}