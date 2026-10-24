import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "aluno") redirect("/portal");

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("audience", "staff")
    .is("read_at", null);

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unread={count ?? 0} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
