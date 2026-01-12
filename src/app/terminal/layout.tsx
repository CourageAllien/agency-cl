"use client";

import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutWrapper showHeader={false}>
      {children}
    </LayoutWrapper>
  );
}
