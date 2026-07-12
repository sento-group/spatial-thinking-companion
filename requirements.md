# 要件定義書: Spatial Thinking Companion

## 1. 概要

### 背景・目的

和島祐生は、情報を時間、抽象度、社会的範囲、因果、依存、前提、差分として空間配置し、具体論の変更を上位目的へ戻しながら考える。この思考法を知らないsento.groupメンバーは、一般的なチャットやホワイトボードだけでは同じ構造化を再現できない。

本プロダクトは新しい作図ソフトではない。入力文を型付き思考グラフへ変換し、問いに適したマッピング手法を選択・適用して、メンバーの思考を補助する「思考マッピングエンジン」である。

### 対象ユーザー

- 主対象: 空間視覚思考や各種マッピング手法に習熟していないsento.groupメンバー
- 副対象: 自分の思考を可視化・共有・AIへ受け渡したい和島祐生
- 将来対象: 顧客企業の意思決定者・プロジェクトメンバー

### スコープ

#### やること

- 短い依頼または継続チャットから初期ロードマップを生成する
- 入力の性質に応じて適切なマッピング手法を選択・提案する
- 同じ思考グラフをロードマップ、空間マップ、関係グラフで再描画する
- 人間によるノード・関係・配置編集を次のAI対話へ反映する
- 下位変更から上位論点への昇格、未解決、盲点、Parking Lotを保持する
- 盤面をAIブリーフ、JSON、Markdown、XMindへ変換する
- ブラウザへローカル保存し、履歴・Undo・再読込を提供する
- Vercel上でsento.groupメンバーが利用できるようにする

#### MVPでやらないこと

- XMind、Miro、Excalidrawの全機能再現
- リアルタイム共同編集
- 個人アカウント管理
- 顧客向け課金、組織管理、監査ログ
- すべての既存マッピング手法の初期実装
- 方法論の学術的完成

## 2. 中心体験

```text
短い依頼を入力
  → AIが問いの種類と構造を判定
  → 適切なマッピング手法で初期ロードマップを生成
  → 人が盤面を直接編集
  → AIが編集結果と意図を踏まえて対話・差分更新
  → 別のビューへ再描画
  → AIブリーフまたは実行Planへ変換
```

## 3. 機能要件

| # | 機能 | 優先度 | 詳細 |
|---|---|---|---|
| F-01 | テキスト・チャット入力 | Must | 短文、長文、継続対話を受け付ける |
| F-02 | マッピング手法選択 | Must | 入力から推奨ビューを選び、選択理由を短く示す。ユーザーが変更可能 |
| F-03 | 初期思考グラフ生成 | Must | 本筋、ノード、型付き関係、現在枝、未解決を生成する |
| F-04 | ロードマップビュー | Must | XMind型の包含階層を既定表示し、展開・折り畳み・直接編集を可能にする |
| F-05 | 空間マップ | Must | Time × AbstractionとTime × Social Reachを切り替えて表示する |
| F-06 | 関係グラフ | Must | 因果、依存、手段、前提、矛盾、代替などの型付き関係を表示する |
| F-07 | 人間編集 | Must | ノード追加・編集・削除・移動・統合、関係追加・変更、現在枝選択を行える |
| F-08 | AI差分パッチ | Must | 初回後は現在枝中心の差分更新とし、変更箇所を示してUndo可能にする |
| F-09 | 人間編集優先 | Must | 人が確定・移動・ロックした内容をAIが無断で上書きしない |
| F-10 | 分析レイヤー | Must | 決定、未解決、盲点、矛盾、昇格候補、Parking Lotを横断表示する |
| F-11 | 上位への昇格 | Must | 下位変更が主体・依存・戦略を変える場合、上位論点候補を作る |
| F-12 | AIブリーフ | Must | 本筋、現在地、決定、根拠、未解決、保留、関係、次の一歩、AIへの依頼をMarkdown化する |
| F-13 | ローカル保存 | Must | 思考セッション、履歴、現在枝、描画状態をブラウザへ保存・復元する |
| F-14 | JSON入出力 | Must | 描画エンジン非依存の思考グラフを損失なく保存・読込する |
| F-15 | Markdown出力 | Should | 人間が読みやすい階層文書を出力する |
| F-16 | XMind出力 | Should | 既存の和島ワークフローへ持ち出せる `.xmind` を生成する |
| F-17 | 履歴・Undo/Redo | Must | AI更新と人間編集を取り消し・再適用できる |
| F-18 | 手法拡張 | Should | Dialogue/IBIS、Causal Loop、Assumption Map等を後から追加できる戦略インターフェースを持つ |

### MVPで実装するマッピング手法

1. Roadmap / Mind Map: 目的から論点・手段・行動への包含階層
2. Time × Abstraction: 過去・現在・未来 × 具体・構造・抽象
3. Time × Social Reach: 短期・中期・長期 × 自己・組織・市場・社会・将来世代
4. Typed Relation Graph: 因果・依存・手段・前提・矛盾・代替の非階層関係

## 4. 思考グラフの正本データ

```yaml
thinking_state:
  north_star:
    statement: string
    success_condition: string
  active_branch_id: string | null
  recommended_view: roadmap | time_abstraction | time_social_reach | relation
  nodes:
    - id: string
      statement: string
      type: fact | question | hypothesis | decision | action | risk
      time: past | present | future | timeless
      abstraction: concrete | structure | abstract
      social_reach: self | close_group | organization | market | society | future_generations
      certainty: number
      status: active | resolved | parked
      parent_id: string | null
      facts: string[]
      user_locked: boolean
  edges:
    - id: string
      from: string
      to: string
      relation: causes | requires | means | supports | replaces | assumes | contradicts | includes | invalidates | affects | example_of
  unresolved_questions: string[]
  contradictions: string[]
  blind_spots: string[]
  promotion_queue: string[]
  parking_lot: string[]
```

描画ライブラリ固有の要素・座標・画面状態は派生データとし、意味の正本へ混ぜない。人間が配置を意味として確定した場合は、正本側へ配置意図またはロックとして戻す。

## 5. AIの責務境界

- 初回は全体の初期グラフを生成する
- 以降は現在枝、上位要約、未解決を中心に差分パッチを返す
- 本筋の変更と全体再構成は提案に留め、人間承認後に適用する
- 人間がロックしたノード・関係・配置を上書きしない
- 事実と仮説を区別し、根拠のない補完を事実として扱わない
- 一度に増やす主要概念は最大3個、深掘る枝は1本を既定とする
- 重要ノード追加、矛盾、枝切替、上位昇格で再描画する

## 6. 非機能要件

### パフォーマンス

- 100ノード・150関係で表示、選択、移動、ビュー切替が実用範囲で動作する
- AIへ常時全グラフを送らず、現在枝と要約を中心にコンテキストを制御する
- 大規模グラフでは折り畳み、段階表示、現在枝フォーカスを使う

### セキュリティ

- AI APIキーをブラウザへ埋め込まない
- Vercelのサーバー処理からAI providerを呼ぶ
- 個人アカウントは作らず、sento.group共通アクセスコードで保護する
- サーバー側でレート制限を行う
- 思考データは既定で端末ローカルへ保存し、サーバーへ永続保存しない

### 対応環境

- 最新のChrome、Safari、Edge
- デスクトップを第一優先
- タブレットは閲覧・軽編集を目標とし、MVP合格条件には含めない

### 可搬性・保守性

- 思考グラフスキーマは描画・AI providerから独立させる
- 描画エンジンとマッピング手法を交換・追加可能にする
- コードは公開リポジトリで管理可能な状態にする

## 7. 画面一覧

| # | 画面名 | 主な機能 |
|---|---|---|
| S-01 | アクセス画面 | 共通アクセスコード入力 |
| S-02 | 思考ワークスペース | チャット、3ビュー、分析レイヤー、ノード編集 |
| S-03 | セッション一覧 | ローカル保存されたセッションの作成、複製、削除、再開 |
| S-04 | 出力パネル | AIブリーフ、JSON、Markdown、XMindの確認・コピー・保存 |
| S-05 | 履歴パネル | AI差分・人間編集の履歴、Undo/Redo、復元 |

## 8. 外部連携

- AI provider: サーバー側adapter経由。初期providerは比較実装で決定する
- 描画: React FlowとExcalidrawを比較し、中核を1つ選ぶ
- XMind: `.xmind`ファイル生成
- Vercel: アプリとサーバーAPIのホスティング
- GitHub: 公開ソースコード管理

## 9. 受入条件

1. 短い実課題を入力すると、本筋と初期ロードマップが生成される
2. 推奨マッピング手法と選択理由が表示される
3. 同じ思考グラフを3ビューで切り替えても意味が矛盾しない
4. 人間が移動・統合・削除・確定した後、次のAI応答がその編集を保持する
5. AI更新をUndoし、更新前の状態へ戻せる
6. JSON保存・再読込で、盤面、現在枝、履歴が復元される
7. AIブリーフを別のAIへ渡すと、本筋、決定、未解決、次の一歩を再現できる
8. 100ノード・150関係で主要操作が破綻しない
9. sento.groupメンバー3名が説明なしで実課題を入力し、行動可能な次の一歩まで到達できる

## 10. 制約・前提条件

- 現在の作業リポジトリをMVP開発の起点とする
- `spatial_dialogue_board_v2.html`の初速とXMind型体験を継承する
- 既存描画ライブラリを再利用し、キャンバス機能をゼロから作らない
- 外部公開、GitHub公開、Vercel本番公開はHuman Gateとして直前に確認する
- MVPは可逆な比較と差し替えを優先し、顧客向け完成度を先取りしない

## 11. 未決事項と検証方法

| 未決事項 | 影響 | 解消方法 | 開発停止条件 |
|---|---|---|---|
| React Flow / Excalidraw | UI・同期 | 同一100ノード・編集往復prototype | どちらも主要操作を満たさない場合、描画構成を再検討 |
| 初期AI provider | 品質・費用 | 同一プロンプトと差分schemaで比較 | 構造化出力が安定しない場合、provider/modelを変更 |
| 自動レイアウト | 大規模性能 | Roadmap・relation・spatial別にstress test | 100ノードで判読不能ならMVPを通さない |
| 人間編集の意図推定 | 中心価値 | 移動・統合・削除の具体シナリオtest | 編集後のAI理解が再現しない場合、明示操作UIへ寄せる |
| レート制限方式 | 費用 | Vercel環境で公式手段を確認 | 公開URLから無制限呼出できる状態では公開しない |
