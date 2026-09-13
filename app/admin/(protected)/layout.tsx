import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const alertCount = await prisma.alert.count({ where: { acknowledgedAt: null } });

  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminNav alertCount={alertCount} />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
