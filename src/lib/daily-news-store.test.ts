import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { createPrismaDailyNewsStore } from "./daily-news-store";
import { NEWS_PURGE_BATCH, staleNewsWhere } from "./news-retention";

describe("Prisma news store", () => {
  it("inserts with skipDuplicates", async () => {
    let captured: { skipDuplicates?: boolean; data: unknown[] } | null = null;
    const prisma = {
      newsItem: {
        createMany: async (args: { skipDuplicates?: boolean; data: unknown[] }) => {
          captured = args;
          return { count: args.data.length };
        },
      },
    } as unknown as PrismaClient;

    const store = createPrismaDailyNewsStore(prisma);
    await store.insertNewsItems([
      {
        supplierKey: "maersk|DK",
        urlHash: "ab".repeat(32),
        title: "Headline",
        url: "https://example.com/a",
        source: "Reuters",
        publishedAt: new Date("2026-10-30T00:00:00Z"),
        raw: {
          title: "Headline",
          link: "https://example.com/a",
          published: "Fri, 30 Oct 2026 00:00:00 GMT",
          description: "",
          source: "Reuters",
          feed: "google-news",
        },
      },
    ]);

    assert.equal(captured!.skipDuplicates, true);
    assert.equal(captured!.data.length, 1);
  });

  it("purges in batches using the 90-day low-score filter", async () => {
    const cutoff = new Date("2026-08-02T00:00:00Z");
    const finds: unknown[] = [];
    let phase = 0;
    const prisma = {
      newsItem: {
        findMany: async (args: { where: unknown; take: number }) => {
          finds.push(args);
          phase += 1;
          if (phase === 1) return [{ id: "n1" }, { id: "n2" }];
          return [];
        },
        deleteMany: async () => ({ count: 2 }),
      },
    } as unknown as PrismaClient;

    const store = createPrismaDailyNewsStore(prisma);
    const removed = await store.purge(cutoff);
    assert.equal(removed, 2);
    const first = finds[0] as { take: number; where: unknown };
    assert.equal(first.take, NEWS_PURGE_BATCH);
    assert.deepEqual(first.where, staleNewsWhere(cutoff));
  });
});
