# Spatial Thinking Companion

文章を、判断に使える「空間思考の地図」へ変換するワークスペースです。一般的なホワイトボードではなく、sento.groupで使う空間視覚思考を、未習熟のメンバーでも再現できる思考マッピングエンジンとして実装しています。

## できること

- 短い相談文から、本筋・現在地・次の一歩を持つ初期地図を生成
- 入力に合わせて、ロードマップ / 時間×抽象度 / 時間×対象範囲 / 関係グラフを推奨
- 同じ正本データを4つのビューで再描画
- ノードの追加・編集・削除・移動・固定、現在枝の選択
- AIによる差分更新と、固定ノード変更時の承認ゲート
- Undo / Redoとブラウザ内への自動保存
- AIブリーフ / JSON / Markdown / XMindへの出力
- AI設定がない環境でも動くローカル補助モード

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

テストには、正本スキーマ、差分コマンド、人間編集保護、マッピング選択、4ビュー投影、JSON往復、各種出力、100ノード・150関係のストレスケースが含まれます。

## 設計の中心

描画ライブラリのJSONを正本にはしません。`ThinkingGraph`を意味の正本として保持し、React Flowはその描画アダプターとして扱います。この分離により、将来Excalidraw等へ描画を差し替えても、思考法・AI対話・出力形式を失いません。

```text
入力 / 継続対話
  → Mapping Recommender
  → ThinkingGraph（正本）
  → GraphCommand（差分）
  → View Projector
  → React Flow
  → AI Brief / JSON / Markdown / XMind
```

詳細は [requirements.md](./requirements.md)、[architecture.md](./architecture.md)、[spec.md](./spec.md)、[ADR](./docs/adr/0001-separate-thinking-graph-from-renderer.md) を参照してください。

## 現在の境界

- デスクトップ優先
- リアルタイム共同編集・個人アカウント・課金は対象外
- 思考データは既定でブラウザ内にのみ保存
- `ACCESS_CODE`を設定した公開環境では、共通コード認証とサーバー側レート制限が有効になる
- 現在のレート制限はサーバーインスタンス単位。顧客公開時はVercel Firewall等の共有ストア型制限へ切り替える

## License

MIT
