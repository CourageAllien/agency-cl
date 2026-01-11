"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  RefreshCw,
  Command,
  User,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const pathTitles: Record<string, string> = {
  "/campaign-manager": "Home",
  "/campaign-manager/clients": "Clients",
  "/campaign-manager/analytics": "Analytics",
  "/campaign-manager/inboxes": "Inboxes",
  "/campaign-manager/tasks": "Tasks",
  "/campaign-manager/terminal": "Terminal",
  "/campaign-manager/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pageTitle = pathTitles[pathname] || "Dashboard";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-lg">
        {/* Left side - Page title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Campaign Manager
          </Badge>
        </div>

        {/* Center - Search */}
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients, campaigns..."
              className="w-full bg-muted/50 pl-9 pr-12"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5">
              <Command className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">K</span>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    isRefreshing && "animate-spin"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh data</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          <div className="ml-2 h-8 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  C
                </div>
                <span className="text-sm">Courage</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="w-48">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
