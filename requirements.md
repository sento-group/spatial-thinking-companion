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

- 短い依頼または継続チャットから初期思考マップを生成する
- 主ルートと型付き関係を1枚の盤面で切り替える
- 各ノードの反論・盲点・前提へ回答し、構造変更案を確認して適用する
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
  → 1枚の思考マップを生成
  → 人が盤面を直接編集
  → ノードごとの反論・盲点・前提へ回答
  → AIが順序・前提・関係の差分を提案
  → 人が確認して構造へ適用
  → AIブリーフまたは実行Planへ変換
```

## 3. 機能要件

| # | 機能 | 優先度 | 詳細 |
|---|---|---|---|
| F-01 | テキスト・チャット入力 | Must | 短文、長文、継続対話を受け付ける |
| F-02 | 関係レイヤー切替 | Must | 主ルートと全関係を、同じ配置を保って切り替える |
| F-03 | 初期思考グラフ生成 | Must | 本筋、ノード、型付き関係、現在枝、未解決を生成する |
| F-04 | 思考マップ | Must | XMind型の包含階層を主ルートにし、型付き関係線を同じ盤面へ重ねる |
| F-05 | ノード検証 | Must | 反論・盲点・前提・矛盾を対象ノードへ紐づけ、回答できる |
| F-06 | 構造変更プレビュー | Must | 回答による順序・親子・前提・関係線の変更を適用前に示す |
| F-07 | 人間編集 | Must | ノード追加・編集・削除・移動・統合、関係追加・変更、現在枝選択を行える |
| F-08 | AI差分パッチ | Must | 初回後は現在枝中心の差分更新とし、変更箇所を示してUndo可能にする |
| F-09 | 人間編集優先 | Must | 人が確定・移動・ロックした内容をAIが無断で上書きしない |
| F-10 | 検証パネル | Must | 選択ノードの検証課題、回答、構造差分、解決履歴を表示する |
| F-11 | 上位への昇格 | Must | 下位変更が主体・依存・戦略を変える場合、上位論点候補を作る |
| F-12 | AIブリーフ | Must | 本筋、現在地、決定、根拠、未解決、保留、関係、次の一歩、AIへの依頼をMarkdown化する |
| F-13 | ローカル保存 | Must | 思考セッション、履歴、現在枝、描画状態をブラウザへ保存・復元する |
| F-14 | JSON入出力 | Must | 描画エンジン非依存の思考グラフを損失なく保存・読込する |
| F-15 | Markdown出力 | Should | 人間が読みやすい階層文書を出力する |
| F-16 | XMind出力 | Should | 既存の和島ワークフローへ持ち出せる `.xmind` を生成する |
| F-17 | 履歴・Undo/Redo | Must | AI更新と人間編集を取り消し・再適用できる |
| F-18 | キーボード操作 | Must | Tabで子、Enterで分岐、Shift+Rで型付き関係線を追加する |
| F-19 | 原文対応 | Must | 初回・追加入力を逐語保存し、生成・更新ノードから参照できる |
| F-20 | 枝の折り畳み | Must | 子孫を一時的に隠し、非表示件数を表示して再展開できる |

### MVPで実装する盤面

1. 主ルート: 目的から論点・手段・行動への包含階層
2. 全関係: 主ルートに因果・依存・手段・前提・矛盾・代替を重ねる
3. Time / Abstraction / Social Reachは分析属性として保持し、独立ビューにはしない

## 4. 思考グラフの正本データ

```yaml
thinking_state:
  north_star:
    statement: string
    success_condition: string
  active_branch_id: string | null
  recommended_view: relation
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
      order: number
      facts: string[]
      user_locked: boolean
      source_ids: string[]
  sources:
    - id: string
      kind: initial_input | message | challenge_response
      text: string
  edges:
    - id: string
      from: string
      to: string
      relation: causes | requires | means | supports | replaces | assumes | contradicts | includes | invalidates | affects | example_of
  unresolved_questions: string[]
  contradictions: string[]
  blind_spots: string[]
  challenges:
    - id: string
      target_node_id: string
      kind: blind_spot | objection | assumption | question | contradiction
      statement: string
      status: open | answered | resolved | parked
      response: string | null
      impact_summary: string | null
  promotion_queue: string[]
  parking_lot: string[]
```

描画ライブラリ固有の要素・座標・画面状態は派生データとし、意味の正本へ混ぜない。人間が配置を意味として確定した場合は、正本側へ配置意図またはロックとして戻す。

## 5. AIの責務境界

- 初回は全体の初期グラフを生成する
- 意味判断はClaude Sonnet 5、参照検証・正規化はTypeScriptが担当する
- 逐語の原文を正本としてSonnet 5へ渡し、内部要約だけで判断しない
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

1. 短い実課題を入力すると、本筋と初期思考マップが生成される
2. 主ルートと全関係を切り替えてもノード配置が飛ばない
3. 各検証課題が対象ノードへ紐づき、盤面上で件数を認識できる
4. 人間が移動・統合・削除・確定した後、次のAI応答がその編集を保持する
5. AI更新をUndoし、更新前の状態へ戻せる
6. JSON保存・再読込で、盤面、現在枝、履歴が復元される
7. AIブリーフを別のAIへ渡すと、本筋、決定、未解決、次の一歩を再現できる
8. 100ノード・150関係で主要操作が破綻しない
9. sento.groupメンバー3名が説明なしで実課題を入力し、行動可能な次の一歩まで到達できる
10. 検証課題へ回答すると構造差分が提示され、適用・却下・Undoができる
11. Tab・Enter・Shift+Rでノードと関係線を追加できる

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
| 自動レイアウト | 大規模性能 | 主ルートと全関係でstress test | 100ノードで判読不能ならMVPを通さない |
| 人間編集の意図推定 | 中心価値 | 移動・統合・削除の具体シナリオtest | 編集後のAI理解が再現しない場合、明示操作UIへ寄せる |
| レート制限方式 | 費用 | Vercel環境で公式手段を確認 | 公開URLから無制限呼出できる状態では公開しない |
