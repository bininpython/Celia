import { redirect } from "next/navigation";
import { BrandStyle } from "@/components/brand/brand-style";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "aluno") redirect("/portal");

  const supabase = await createClient();
  const [{ count }, { data: gym }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("audience", "staff").is("read_at", null),
    supabase.from("gyms").select("primary_color").single(),
  ]);

  return (
    <div className="flex min-h-dvh">
      <BrandStyle color={gym?.primary_color} />
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unread={count ?? 0} />
        <main className="mx-auto w-full max-w-[96rem] flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
