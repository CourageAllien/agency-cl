"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Send,
  Sparkles,
  Loader2,
  HelpCircle,
  Zap,
  ArrowUp,
  User,
  Bot,
  Copy,
  Check,
  Calendar,
  CalendarDays,
  ListChecks,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Quick suggestion chips - organized by use case
const QUICK_SUGGESTIONS = [
  { label: "📊 Campaigns", query: "list" },
  { label: "📋 Daily Report", query: "daily report" },
  { label: "📈 Weekly Report", query: "weekly report" },
  { label: "📧 Inbox Health", query: "inbox health" },
  { label: "🚨 Low Leads", query: "low leads" },
  { label: "📉 Benchmarks", query: "benchmarks" },
];

// Extended suggestions for after first query
const MORE_SUGGESTIONS = [
  { label: "Conversion", query: "conversion" },
  { label: "Reply Trends", query: "reply trends" },
  { label: "Send Volume 7d", query: "send volume 7d" },
  { label: "Interested", query: "interested" },
  { label: "Meetings", query: "meetings booked" },
  { label: "Diagnose", query: "diagnose" },
  { label: "Tags", query: "tags" },
  { label: "Templates", query: "templates" },
];

const COMMAND_HELP = [
  { category: "📋 Daily Tasks", commands: [
    { cmd: "daily", desc: "Today's campaign analysis" },
    { cmd: "daily report", desc: "Full daily form answers" },
    { cmd: "send volume", desc: "Check send volume" },
    { cmd: "send volume 7d", desc: "7-day send trend" },
    { cmd: "low leads", desc: "Campaigns <3000 leads" },
  ]},
  { category: "📊 Weekly Tasks", commands: [
    { cmd: "weekly", desc: "7-day performance" },
    { cmd: "weekly report", desc: "Wednesday form answers" },
    { cmd: "benchmarks", desc: "Below target campaigns" },
    { cmd: "conversion", desc: "Positive reply to meeting" },
    { cmd: "bad variants", desc: "Underperforming variants" },
    { cmd: "reply trends", desc: "Reply rate trends" },
  ]},
  { category: "📧 Inboxes", commands: [
    { cmd: "inbox health", desc: "Full inbox report" },
    { cmd: "inbox issues", desc: "Disconnected/errors by tag" },
    { cmd: "warmup", desc: "Warmup status" },
  ]},
  { category: "👥 Leads", commands: [
    { cmd: "leads", desc: "Lead overview" },
    { cmd: "interested", desc: "Positive leads" },
    { cmd: "meetings booked", desc: "Booked leads" },
    { cmd: "lead lists", desc: "View lead lists" },
  ]},
  { category: "🏷️ Resources", commands: [
    { cmd: "campaigns / list", desc: "All campaigns with analysis" },
    { cmd: "tags", desc: "Custom tags" },
    { cmd: "templates", desc: "Email templates" },
    { cmd: "block list", desc: "Blocked entries" },
  ]},
  { category: "🔍 Diagnostics", commands: [
    { cmd: "diagnose [name]", desc: "Diagnose specific campaign" },
    { cmd: "verify [email]", desc: "Verify email address" },
    { cmd: "status", desc: "Check API connection" },
  ]},
  { category: "💬 Natural Language", commands: [
    { cmd: "Which campaigns need leads?", desc: "Question format" },
    { cmd: "How is [campaign] doing?", desc: "Campaign-specific" },
    { cmd: "What are my tasks today?", desc: "Task summary" },
  ]},
];

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (queryOverride?: string) => {
    const query = queryOverride || input.trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, {
      id: typingId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isTyping: true,
    }]);

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      // Replace typing indicator with actual response
      setMessages((prev) => prev.filter(m => m.id !== typingId).concat({
        id: typingId,
        role: "assistant",
        content: data.response || "I couldn't process that request. Please try again.",
        timestamp: new Date(),
      }));
    } catch (error) {
      console.error('Terminal error:', error);
      setMessages((prev) => prev.filter(m => m.id !== typingId).concat({
        id: typingId,
        role: "assistant",
        content: "⚠️ Connection error. Please try again.",
        timestamp: new Date(),
      }));
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

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatContent = (content: string) => {
    // Format markdown-style content
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>;
      }
      
      // Check for markdown links [text](url)
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const beforeLink = line.substring(0, linkMatch.index);
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        const afterLink = line.substring((linkMatch.index || 0) + linkMatch[0].length);
        
        // Format surrounding text
        let formattedBefore = beforeLink.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        let formattedAfter = afterLink.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        
        return (
          <p key={i} className="my-2">
            <span dangerouslySetInnerHTML={{ __html: formattedBefore }} />
            <a 
              href={linkUrl} 
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-4 font-medium transition-colors"
            >
              {linkText}
            </a>
            <span dangerouslySetInnerHTML={{ __html: formattedAfter }} />
          </p>
        );
      }
      
      // Bold
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      // Code blocks
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
      // Italics (for hints like "_Click to see..._")
      formatted = formatted.replace(/_([^_]+)_/g, '<em class="text-muted-foreground text-sm">$1</em>');
      // Emoji bullets
      if (line.match(/^[🔴🟡🟢⚠️✅❌📊📈📉🚨💡👉•]/)) {
        return <p key={i} className="ml-2 my-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      // Numbered lists
      if (line.match(/^\d+\./)) {
        return <p key={i} className="ml-4 my-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      // Dividers
      if (line.startsWith('---') || line.startsWith('━━━') || line.startsWith('───')) {
        return <hr key={i} className="my-3 border-border" />;
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Campaign Terminal</h1>
            <p className="text-xs text-muted-foreground">AI-powered campaign analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
            <Zap className="h-3 w-3" />
            Live Data
          </Badge>
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Commands & Examples</DialogTitle>
                <DialogDescription>
                  Use these commands or ask questions naturally
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                {COMMAND_HELP.map((cat) => (
                  <div key={cat.category}>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{cat.category}</h3>
                    <div className="space-y-1">
                      {cat.commands.map((cmd) => (
                        <button
                          key={cmd.cmd}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center justify-between"
                          onClick={() => {
                            setShowHelp(false);
                            if (!cmd.cmd.includes(' ')) {
                              handleSubmit(cmd.cmd);
                            }
                          }}
                        >
                          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                            {cmd.cmd}
                          </code>
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
      </header>

      {/* Chat Area */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-6">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Campaign Terminal
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Ask questions about your campaigns in natural language or use quick commands
              </p>
              
              {/* Primary Action */}
              <button
                onClick={() => handleSubmit("list")}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors text-left w-full max-w-md mb-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">List All Active Campaigns</div>
                  <div className="text-xs text-muted-foreground">Full analysis with classification & actions</div>
                </div>
              </button>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
                <button
                  onClick={() => handleSubmit("daily")}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                >
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">Daily Report</div>
                    <div className="text-xs text-muted-foreground">Today&apos;s metrics</div>
                  </div>
                </button>
                <button
                  onClick={() => handleSubmit("weekly")}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
                >
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium text-sm">Weekly Report</div>
                    <div className="text-xs text-muted-foreground">7-day analysis</div>
                  </div>
                </button>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {QUICK_SUGGESTIONS.slice(2).map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSubmit(s.query)}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              
              {/* More suggestions */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-xl">
                {MORE_SUGGESTIONS.slice(0, 4).map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSubmit(s.query)}
                    className="px-2.5 py-1 rounded-full border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={cn(
                  "flex gap-4",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}>
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className={cn(
                    "group relative max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50"
                  )}>
                    {message.isTyping ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing campaigns...</span>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "text-sm whitespace-pre-wrap",
                          message.role === "assistant" && "prose prose-sm dark:prose-invert max-w-none"
                        )}>
                          {message.role === "assistant" 
                            ? formatContent(message.content)
                            : message.content
                          }
                        </div>
                        
                        {/* Copy button for assistant messages */}
                        {message.role === "assistant" && !message.isTyping && (
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-background border border-border hover:bg-muted"
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          {/* Quick suggestions when there are messages */}
          {messages.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-none">
              {[...QUICK_SUGGESTIONS, ...MORE_SUGGESTIONS.slice(0, 4)].map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSubmit(s.query)}
                  disabled={isLoading}
                  className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Input */}
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your campaigns..."
              className="flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm focus:outline-none min-h-[44px] max-h-[200px]"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Try: &quot;daily&quot;, &quot;weekly&quot;, or ask any question about your campaigns
          </p>
        </div>
      </div>
    </div>
  );
}
