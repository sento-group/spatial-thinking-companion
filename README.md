# Spatial Thinking Companion

文章を、判断に使える「空間思考の地図」へ変換するワークスペースです。一般的なホワイトボードではなく、sento.groupで使う空間視覚思考を、未習熟のメンバーでも再現できる思考マッピングエンジンとして実装しています。

## できること

- 短い相談文から、本筋・現在地・次の一歩を持つ初期地図を生成
- 主ルートと型付き関係線を、1枚の思考マップ上で切り替え
- ノードごとの反論・盲点・前提へ回答し、構造変更をプレビューして適用
- ノードの追加・編集・削除・移動・固定、現在枝の選択
- Tabで子、Enterで分岐、Shift+Rで関係線を追加
- AIによる差分更新と、固定ノード変更時の承認ゲート
- Undo / Redoとブラウザ内への自動保存
- AIブリーフ / JSON / Markdown / XMindへの出力
- AI設定がない環境でも動くローカル補助モード
- 初回・追加入力の原文をノードへ紐づけて保持
- 枝ごとの軽量クラスタ表示と折り畳み

## 起動

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

AI Gatewayを使う場合は `.env.example` を `.env.local` へコピーし、認証情報を設定してください。未設定時は、入力文を端末内の規則で分解するローカル補助モードになります。

## 検証

```bash
npm test
npm run lint
npm run build
```

テストには、正本スキーマ、検証課題、差分コマンド、人間編集保護、JSON往復、各種出力、100ノード・150関係のストレスケースが含まれます。

## 設計の中心

描画ライブラリのJSONを正本にはしません。`ThinkingGraph`を意味の正本として保持し、React Flowはその描画アダプターとして扱います。この分離により、将来Excalidraw等へ描画を差し替えても、思考法・AI対話・出力形式を失いません。

```text
入力 / 継続対話
  → 原文（逐語・source ID）
  → ThinkingGraph（正本）
  → ノード別Challenge（反論・盲点・前提）
  → GraphCommand（差分）
  → 主ルート / 全関係レイヤー
  → React Flow
  → AI Brief / JSON / Markdown / XMind
```

意味判断はClaude Sonnet 5、参照整合性とlocked保護はTypeScriptが担当します。軽量モデルは、将来ラベル短縮など意味を変えない補助処理へ限定します。

詳細は [requirements.md](./requirements.md)、[architecture.md](./architecture.md)、[spec.md](./spec.md)、[ADR](./docs/adr/0001-separate-thinking-graph-from-renderer.md) を参照してください。
公開後の改善候補は [docs/post-launch-improvement-backlog.md](./docs/post-launch-improvement-backlog.md) に分離しています。

## 現在の境界

- デスクトップ優先
- リアルタイム共同編集・個人アカウント・課金は対象外
- 思考データは既定でブラウザ内にのみ保存
- `ACCESS_CODE`を設定した公開環境では、共通コード認証とサーバー側レート制限が有効になる
- 現在のレート制限はサーバーインスタンス単位。顧客公開時はVercel Firewall等の共有ストア型制限へ切り替える

## License

MIT
