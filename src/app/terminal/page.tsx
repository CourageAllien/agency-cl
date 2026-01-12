"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
  Terminal,
  Send,
  Sparkles,
  Loader2,
  ChevronRight,
  HelpCircle,
  List,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Mail,
  Zap,
} from "lucide-react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Available command queries organized by category
const COMMAND_QUERIES = {
  "Client Performance": [
    "Are there clients that are not hitting their benchmarks?",
    "Which clients need attention today?",
    "Show me clients with low reply rates",
    "Who has the best conversion rate?",
    "Compare client performance",
  ],
  "Conversion & Meetings": [
    "Are there any clients with sub 40% positive reply to meeting ratio?",
    "What's the average conversion rate across all clients?",
  ],
  "Inbox Health": [
    "Are there disconnected inboxes, or inboxes with sending errors?",
    "List all inbox issues by tag",
    "What's the overall inbox health status?",
  ],
  "Trends & Analytics": [
    "Are reply rates trending downward since last week?",
    "What's the portfolio health summary?",
    "Show me weekly trend analysis",
  ],
  "Tasks & Actions": [
    "Please list summary of all tasks done today",
    "Show tasks due this week",
    "What are the critical tasks right now?",
  ],
  "Volume & Leads": [
    "Which clients are running low on leads?",
    "List all deliverability issues",
    "What's the total send volume this week?",
  ],
};

const QUICK_SUGGESTIONS = [
  "Are there clients not hitting benchmarks?",
  "Any clients with sub 40% reply-to-meeting?",
  "Disconnected inboxes or sending errors?",
  "Are reply rates trending down?",
  "Summary of tasks done today",
];

export default function TerminalPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: `🚀 **Welcome to the Agency Command Terminal!**

I'm powered by Claude AI and connected to your Instantly data. I can analyze your campaigns in real-time and provide actionable insights.

**What I can help with:**
• 📊 Client performance & benchmarks
• 📬 Inbox health & deliverability
• 📈 Reply rates & conversion trends
• ✅ Tasks & action items
• 🔍 Deep campaign analysis

Click the **?** button to see all available commands, or just ask me anything!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the Claude API via our terminal endpoint
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content }),
      });

      let assistantContent: string;

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || "I couldn't process that request. Please try again.";
      } else {
        assistantContent = "⚠️ Unable to connect to AI. Please check your API configuration.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
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

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Terminal className="h-6 w-6 text-primary" />
            Command Terminal
          </h1>
          <p className="text-muted-foreground">
            AI-powered natural language interface for your campaign data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/50">
            <Zap className="h-3 w-3" />
            Connected
          </Badge>
          <Badge variant="outline" className="gap-1 text-primary border-primary/50">
            <Sparkles className="h-3 w-3" />
            Claude AI
          </Badge>
          <Dialog open={showCommands} onOpenChange={setShowCommands}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Available Query Commands
                </DialogTitle>
                <DialogDescription>
                  Click on any query to use it in the terminal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {Object.entries(COMMAND_QUERIES).map(([category, queries]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      {category === "Client Performance" && <AlertTriangle className="h-4 w-4 text-yellow-400" />}
                      {category === "Conversion & Meetings" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {category === "Inbox Health" && <Mail className="h-4 w-4 text-purple-400" />}
                      {category === "Trends & Analytics" && <TrendingDown className="h-4 w-4 text-blue-400" />}
                      {category === "Tasks & Actions" && <List className="h-4 w-4 text-orange-400" />}
                      {category === "Volume & Leads" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {queries.map((query) => (
                        <Button
                          key={query}
                          variant="ghost"
                          className="w-full justify-start text-left text-sm h-auto py-2 px-3"
                          onClick={() => {
                            setInput(query);
                            setShowCommands(false);
                            inputRef.current?.focus();
                          }}
                        >
                          <ChevronRight className="mr-2 h-3 w-3 flex-shrink-0" />
                          <span className="text-muted-foreground">{query}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
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
                    "max-w-[80%] rounded-xl px-4 py-3",
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content.split("\n").map((line, i) => (
                      <p key={i} className={line.startsWith("•") ? "ml-2" : ""}>
                        {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                      </p>
                    ))}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs",
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
                <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Suggestions */}
        {messages.length === 1 && (
          <div className="border-t border-border p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Try these queries:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestion(suggestion)}
                  className="h-auto py-1.5 text-xs"
                >
                  <ChevronRight className="mr-1 h-3 w-3" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about clients, campaigns, inboxes, tasks..."
              className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
            />
            <Button
              onClick={handleSubmit}
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
            Press Enter to send, Shift+Enter for new line • Click ? for all commands
          </p>
        </div>
      </Card>
    </div>
  );
}
