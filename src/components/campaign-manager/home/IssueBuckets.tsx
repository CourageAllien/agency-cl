"use client";

import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { BUCKET_CONFIGS, type IssueBucket, type ClientClassification } from "@/types/analysis";
import { getMockClassifications } from "@/lib/mock-data";

interface BucketCardProps {
  bucket: IssueBucket;
  clients: ClientClassification[];
  onClick?: () => void;
}

function BucketCard({ bucket, clients, onClick }: BucketCardProps) {
  const config = BUCKET_CONFIGS[bucket];
  const count = clients.length;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-lg",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="relative">
        <div className="mb-2 text-2xl">{config.icon}</div>
        <div className={cn("text-3xl font-bold", config.color)}>{count}</div>
        <div className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {config.description}
        </div>
        {count > 0 && (
          <div className="mt-3 space-y-1">
            {clients.slice(0, 3).map((client) => (
              <div
                key={client.clientId}
                className="truncate text-xs text-muted-foreground"
              >
                • {client.clientName}
              </div>
            ))}
            {count > 3 && (
              <div className="text-xs text-muted-foreground">
                +{count - 3} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface IssueBucketsProps {
  filterClient?: string;
}

export function IssueBuckets({ filterClient = "all" }: IssueBucketsProps) {
  const allClassifications = getMockClassifications();

  const classifications = useMemo(() => {
    if (filterClient === "all") return allClassifications;
    return allClassifications.filter((c) => c.clientName === filterClient);
  }, [allClassifications, filterClient]);

  // Group classifications by bucket
  const buckets = classifications.reduce((acc, client) => {
    if (!acc[client.bucket]) {
      acc[client.bucket] = [];
    }
    acc[client.bucket].push(client);
    return acc;
  }, {} as Record<IssueBucket, ClientClassification[]>);

  // Order buckets by priority
  const orderedBuckets = Object.entries(BUCKET_CONFIGS)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([bucket]) => bucket as IssueBucket)
    .filter((bucket) => buckets[bucket]?.length > 0 || bucket === "PERFORMING_WELL");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Issue Buckets
        </h2>
        <span className="text-xs text-muted-foreground">
          {classifications.length} client{classifications.length !== 1 ? "s" : ""} analyzed
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {orderedBuckets.map((bucket) => (
          <BucketCard
            key={bucket}
            bucket={bucket}
            clients={buckets[bucket] || []}
          />
        ))}
      </div>
    </div>
  );
}
