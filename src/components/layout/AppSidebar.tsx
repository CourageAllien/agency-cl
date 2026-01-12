"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Mail,
  CheckSquare,
  Terminal,
  Settings,
  Target,
  UserCog,
  ListChecks,
  PenTool,
  Shield,
  ExternalLink,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  items: NavItem[];
  disabled?: boolean;
  isTopLevel?: boolean;
}

const navigation: NavSection[] = [
  {
    title: "Command Terminal",
    icon: Terminal,
    href: "/terminal",
    isTopLevel: true,
    items: [],
  },
  {
    title: "Campaign Manager",
    icon: Target,
    href: "/campaign-manager",
    items: [
      { title: "Home", href: "/campaign-manager", icon: LayoutDashboard },
      { title: "Clients", href: "/campaign-manager/clients", icon: Users },
      { title: "Analytics", href: "/campaign-manager/analytics", icon: BarChart3 },
      { title: "Inboxes", href: "/campaign-manager/inboxes", icon: Mail },
      { title: "Tasks", href: "/campaign-manager/tasks", icon: CheckSquare },
      { title: "Settings", href: "/campaign-manager/settings", icon: Settings },
    ],
  },
  {
    title: "Customer Success",
    icon: UserCog,
    href: "/customer-success",
    disabled: true,
    items: [
      { title: "Dashboard", href: "/customer-success", icon: LayoutDashboard, disabled: true },
    ],
  },
  {
    title: "List Builder",
    icon: ListChecks,
    href: "/list-builder",
    disabled: true,
    items: [
      { title: "Dashboard", href: "/list-builder", icon: LayoutDashboard, disabled: true },
    ],
  },
  {
    title: "Campaign Builder",
    icon: PenTool,
    href: "/campaign-builder",
    disabled: true,
    items: [
      { title: "Dashboard", href: "/campaign-builder", icon: LayoutDashboard, disabled: true },
    ],
  },
  {
    title: "Admin",
    icon: Shield,
    href: "/admin",
    disabled: true,
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, disabled: true },
    ],
  },
];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AppSidebar({ collapsed = false, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  const activeSection = navigation.find((section) =>
    pathname.startsWith(section.href)
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <aside className="flex h-screen w-16 flex-col border-r border-border bg-card/50">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 py-4">
            <nav className="flex flex-col items-center gap-2 px-2">
              {navigation.map((section) => {
                const isActive = pathname.startsWith(section.href);
                const SectionIcon = section.icon;

                return (
                  <Tooltip key={section.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={section.disabled ? "#" : section.href}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          section.disabled && "pointer-events-none opacity-50"
                        )}
                      >
                        <SectionIcon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{section.title}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </ScrollArea>

          <Separator />

          {/* Expand Button */}
          <div className="p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-10 w-10"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
    );
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card/50">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Target className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Agency</h1>
            <p className="text-xs text-muted-foreground">Command Center</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navigation.map((section) => {
            const isActive = pathname.startsWith(section.href);
            const SectionIcon = section.icon;

            if (section.isTopLevel) {
              return (
                <div key={section.href}>
                  <Link
                    href={section.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <SectionIcon className="h-5 w-5" />
                    <span>{section.title}</span>
                    <Sparkles className="ml-auto h-3.5 w-3.5 text-primary" />
                  </Link>
                </div>
              );
            }

            return (
              <div key={section.href} className="space-y-1">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                    isActive ? "text-primary" : "text-muted-foreground",
                    section.disabled && "opacity-50"
                  )}
                >
                  <SectionIcon className="h-4 w-4" />
                  <span>{section.title}</span>
                  {section.disabled && (
                    <span className="ml-auto text-[10px] font-normal normal-case text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>

                {isActive && !section.disabled && (
                  <div className="ml-4 space-y-1">
                    {section.items.map((item) => {
                      const isItemActive = pathname === item.href;
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.disabled ? "#" : item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isItemActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            item.disabled && "pointer-events-none opacity-50"
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <Link
          href="https://instantly.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open Instantly</span>
        </Link>
      </div>
    </aside>
  );
}
