import type { ViewKind } from "@/domain/schema";

export interface MappingRecommendation {
  kind: ViewKind;
  reason: string;
  scores: Record<ViewKind, number>;
}

const signals: Record<ViewKind, string[]> = {
  roadmap: ["目標", "目的", "手順", "段階", "行動", "実行", "ロードマップ", "逆算"],
  time_abstraction: ["過去", "現在", "未来", "具体", "抽象", "構造", "経緯", "時間軸"],
  time_social_reach: [
    "自分",
    "身近",
    "組織",
    "チーム",
    "市場",
    "社会",
    "将来世代",
    "利害",
    "短期",
    "長期",
  ],
  relation: [
    "原因",
    "因果",
    "依存",
    "前提",
    "矛盾",
    "代替",
    "関係",
    "循環",
    "影響",
  ],
};

const reasons: Record<ViewKind, string> = {
  roadmap: "目的から論点・手段・次の行動へ、包含階層で読む問いです。",
  time_abstraction: "経緯と未来、具体と抽象の高さを分けると混線が解ける問いです。",
  time_social_reach: "時間の長さと、影響を受ける主体の広さを同時に見る問いです。",
  relation: "因果・依存・前提・矛盾など、階層以外の関係が中心の問いです。",
};

export function recommendMapping(input: string): MappingRecommendation {
  const normalized = input.toLocaleLowerCase("ja");
  const scores = Object.fromEntries(
    Object.entries(signals).map(([kind, words]) => [
      kind,
      words.reduce((score, word) => score + (normalized.includes(word) ? 1 : 0), 0),
    ]),
  ) as Record<ViewKind, number>;

  const priority: ViewKind[] = [
    "time_social_reach",
    "relation",
    "time_abstraction",
    "roadmap",
  ];
  const kind = priority.reduce((best, candidate) =>
    scores[candidate] > scores[best] ? candidate : best,
  );

  return { kind, reason: reasons[kind], scores };
}
