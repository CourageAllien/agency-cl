"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  HelpCircle,
  CalendarDays,
  CalendarClock,
  Zap,
  RefreshCw,
  TrendingDown,
  AlertTriangle,
  Mail,
  Target,
  CheckSquare,
  Ban,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  command?: string;
  structured?: unknown;
}

// Quick command buttons for each category
const DAILY_COMMANDS = [
  { command: "daily", label: "Daily Summary", icon: CalendarDays, shortcut: "d" },
  { command: "send volume", label: "Send Volume", icon: TrendingDown },
  { command: "low leads", label: "Low Leads", icon: AlertTriangle },
  { command: "blocked domains", label: "Blocked Domains", icon: Ban },
];

const WEEKLY_COMMANDS = [
  { command: "weekly summary", label: "Weekly Summary", icon: CalendarClock, shortcut: "w" },
  { command: "benchmarks", label: "Benchmarks", icon: Target },
  { command: "conversion", label: "Conversion", icon: CheckSquare },
  { command: "inbox health", label: "Inbox Health", icon: Mail },
  { command: "reply trends", label: "Reply Trends", icon: TrendingDown },
];

interface CommandHelpItem {
  cmd: string;
  alias?: string;
  desc: string;
}

const COMMAND_HELP: Record<string, { commands: CommandHelpItem[] }> = {
  "Daily Commands": {
    commands: [
      { cmd: "daily", alias: "d", desc: "Full daily summary" },
      { cmd: "send volume", desc: "Check if send volume is low" },
      { cmd: "low leads", desc: "Campaigns <3000 leads" },
      { cmd: "blocked domains", desc: "Check MSFT/Proofpoint/Mimecast/Cisco" },
    ]
  },
  "Weekly Commands": {
    commands: [
      { cmd: "weekly summary", alias: "w", desc: "Full Wednesday checklist" },
      { cmd: "benchmarks", desc: "Campaigns not hitting targets" },
      { cmd: "conversion", desc: "<40% positive reply to meeting" },
      { cmd: "inbox health", desc: "Disconnected/error inboxes" },
      { cmd: "reply trends", desc: "Trending downward analysis" },
      { cmd: "removed inboxes", desc: "Tag removal report" },
    ]
  },
  "Utility": {
    commands: [
      { cmd: "refresh [command]", desc: "Force fresh data" },
      { cmd: "help", desc: "Show all commands" },
    ]
  }
};

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: `🚀 **Welcome to the Campaign Terminal!**

I'm connected to your Instantly data and ready to help with your daily & weekly tasks.

**Quick Start:**
• Type **d** for daily tasks
• Type **w** for weekly summary
• Or click any button below

**12 Commands Available:**
• 4 daily commands (send volume, low leads, blocked domains)
• 6 weekly commands (benchmarks, conversion, inbox health, trends)
• Type **help** for the full list`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (commandOverride?: string) => {
    const commandToSend = commandOverride || input.trim();
    if (!commandToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: commandToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: commandToSend }),
      });

      let assistantContent: string;
      let command: string | undefined;
      let structured: unknown;

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || "I couldn't process that request. Please try again.";
        command = data.command;
        structured = data.structured;
      } else {
        assistantContent = "⚠️ Unable to connect to the terminal service. Please try again.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        command,
        structured,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Terminal error:', error);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "⚠️ Connection error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCommandClick = (command: string) => {
    handleSubmit(command);
  };

  const handleRefresh = () => {
    if (messages.length > 1) {
      const lastUserMessage = [...messages].reverse().find(m => m.type === "user");
      if (lastUserMessage) {
        handleSubmit(`refresh ${lastUserMessage.content}`);
      }
    }
  };

  const formatMessageContent = (content: string) => {
    // Split by lines and format markdown-like content
    return content.split('\n').map((line, i) => {
      // Bold text
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic text
      const withItalic = formatted.replace(/_(.*?)_/g, '<em class="text-muted-foreground">$1</em>');
      
      return (
        <p 
          key={i} 
          className={cn(
            line.startsWith("•") || line.startsWith("   ") ? "ml-2" : "",
            line.startsWith("---") ? "border-t border-border my-2" : "",
            line.match(/^\d+\./) ? "mt-2" : ""
          )}
          dangerouslySetInnerHTML={{ __html: line.startsWith("---") ? "" : withItalic }}
        />
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Terminal className="h-6 w-6 text-primary" />
            Campaign Terminal
          </h1>
          <p className="text-sm text-muted-foreground">
            12 commands for your daily & weekly campaign tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/50">
            <Zap className="h-3 w-3" />
            Live
          </Badge>
          <Badge variant="outline" className="gap-1 text-primary border-primary/50">
            <Sparkles className="h-3 w-3" />
            AI Ready
          </Badge>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isLoading || messages.length <= 1}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Command Reference
                </DialogTitle>
                <DialogDescription>
                  All available commands for the Campaign Terminal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {Object.entries(COMMAND_HELP).map(([category, { commands }]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{category}</h3>
                    <div className="space-y-1">
                      {commands.map((cmd) => (
                        <button
                          key={cmd.cmd}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted flex items-center justify-between group"
                          onClick={() => {
                            setShowHelp(false);
                            handleSubmit(cmd.cmd.replace(" [command]", ""));
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {cmd.cmd}
                            </code>
                            {cmd.alias && (
                              <code className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                {cmd.alias}
                              </code>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{cmd.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "daily" | "weekly")}>
          <TabsList className="mb-2">
            <TabsTrigger value="daily" className="gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              Weekly
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-wrap gap-2">
          {(activeTab === "daily" ? DAILY_COMMANDS : WEEKLY_COMMANDS).map((cmd) => {
            const Icon = cmd.icon;
            return (
              <Button
                key={cmd.command}
                variant="outline"
                size="sm"
                onClick={() => handleCommandClick(cmd.command)}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {cmd.label}
                {cmd.shortcut && (
                  <kbd className="ml-1 text-[10px] bg-muted px-1 py-0.5 rounded">
                    {cmd.shortcut}
                  </kbd>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col border-border bg-card overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.type === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-4 py-3",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 border border-border text-foreground"
                  )}
                >
                  {message.command && (
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {message.command}
                      </Badge>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm space-y-1">
                    {formatMessageContent(message.content)}
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-xs",
                      message.type === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyzing campaigns...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command (d, w, low leads, benchmarks...)"
              className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Press Enter to send • Shortcuts: <kbd className="px-1 py-0.5 bg-muted rounded">d</kbd> = daily, <kbd className="px-1 py-0.5 bg-muted rounded">w</kbd> = weekly
          </p>
        </div>
      </Card>
    </div>
  );
}
