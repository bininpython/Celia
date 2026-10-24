import { FinanceNav } from "./finance-nav";
import { requireModule } from "@/lib/auth";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireModule("financeiro");
  return (
    <div className="space-y-6">
      <FinanceNav />
      {children}
    </div>
  );
}
