"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

interface LayoutWrapperProps {
  children: React.ReactNode;
  showHeader?: boolean;
  className?: string;
}

export function LayoutWrapper({ 
  children, 
  showHeader = true,
  className = ""
}: LayoutWrapperProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const handleToggle = () => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", JSON.stringify(newValue));
      return newValue;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {showHeader && <Header />}
        <main className={`flex-1 overflow-auto ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
