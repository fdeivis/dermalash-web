import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
