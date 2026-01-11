import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

export default function CampaignManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background gradient-mesh">
          {children}
        </main>
      </div>
    </div>
  );
}
