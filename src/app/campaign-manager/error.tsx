"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function CampaignManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Campaign Manager Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <Card className="w-full max-w-md border-red-500/30 bg-red-500/5">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Error Loading Page
          </h2>
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading this section. This could be a temporary issue.
          </p>
          {error.message && (
            <p className="rounded bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
              {error.message}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/campaign-manager" className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
