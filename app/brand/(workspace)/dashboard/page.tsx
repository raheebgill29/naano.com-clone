import { BrandOverview } from "@/components/brand/overview";
import { loadBrandDashboard } from "@/lib/brand/dashboard-data";
import { requireRole } from "@/lib/auth/session";

export default async function BrandDashboardPage() {
  const { profile } = await requireRole("brand");
  const data = await loadBrandDashboard(profile);
  return <BrandOverview data={data} />;
}
