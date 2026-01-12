"use client";

import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

export default function CampaignManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper showHeader={true} className="gradient-mesh">
      {children}
    </LayoutWrapper>
  );
}
