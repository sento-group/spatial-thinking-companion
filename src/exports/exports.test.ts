import { describe, expect, it } from "vitest";

import { cloneFixture } from "@/domain/fixtures";
import { createAiBrief } from "@/exports/ai-brief";
import { exportGraphJson, importGraphJson } from "@/exports/json";
import { createGraphMarkdown } from "@/exports/markdown";

describe("createAiBrief", () => {
  it("固定9見出しを出力する", () => {
    const brief = createAiBrief(cloneFixture(), "この地図から実行Planを作ってください");
    const headings = [
      "# 本筋",
      "# 現在地",
      "# 決定済み",
      "# 根拠・前提",
      "# 未解決の問い",
      "# Parking Lot",
      "# 関係・依存",
      "# 次の一歩",
      "# AIへの依頼",
    ];

    for (const heading of headings) expect(brief).toContain(heading);
  });
});

describe("graph JSON", () => {
  it("exportしてimportするとgraphを損失なく復元する", () => {
    const graph = cloneFixture();
    expect(importGraphJson(exportGraphJson(graph))).toEqual(graph);
  });
});

describe("createGraphMarkdown", () => {
  it("親子階層とcross edgeを出力する", () => {
    const markdown = createGraphMarkdown(cloneFixture());
    expect(markdown).toContain("思考マッピングエンジンを作る");
    expect(markdown).toContain("## 関係（クロスエッジ）");
    expect(markdown).toContain("—means→");
  });
});
