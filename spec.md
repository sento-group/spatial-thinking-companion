# 仕様書: Spatial Thinking Companion

## 1. 画面仕様

### アクセス画面

- URL: `/unlock`
- 表示: サービス名、共通アクセスコード入力、送信、エラー
- 成功: 署名Cookieを受け取り`/`へ移動
- 失敗: 理由を特定しすぎないエラーを表示

### 思考ワークスペース

- URL: `/`
- 左: セッション、新規作成、チャット履歴、入力欄
- 中央: 主ルートと全関係を切り替える1枚の思考マップ
- 右: 選択ノード、ノード別検証課題、構造差分、出力
- 初期状態: 新規入力またはサンプルセッションを選べる
- 主要操作:
  - テキスト送信
  - 主ルート / 全関係レイヤー切替
  - ノード選択・編集・追加・削除・移動・ロック
  - 関係追加・変更・削除
  - 枝の展開・折り畳み
  - AI差分の確認・適用・取消
  - 反論・盲点・前提への回答と、構造変更案の確認
  - Tabで子、Enterで分岐、Shift+Rで型付き関係線を追加
  - Undo / Redo
  - AIブリーフ・JSON・Markdown・XMind出力

## 2. 状態遷移

```text
empty
  → generating_initial
  → ready
  → generating_patch
  → patch_preview（承認対象を含む場合）
  → ready

ready
  → human_edit
  → ready（command履歴追加・local save）

ready
  → import_validating
  → ready | import_error
```

AI失敗時は既存盤面を変更せず`ready`へ戻る。

## 3. Domain仕様

### ThinkingGraph invariants

- node IDとedge IDは一意
- source IDは一意で、node.sourceIdsは存在するsourceだけを参照する
- edgeのfrom/toは存在するnodeを参照する
- parentIdは自己参照せず、parent chainにcycleを作らない
- activeBranchIdはnullまたは存在するnode
- certaintyは0以上1以下
- north starの変更はapproval対象
- userLocked nodeへのAI update/remove/moveはapproval対象
- node削除時は接続edgeを同じtransactionで削除する
- node merge時はsourceへのedgeをtargetへ付け替え、重複edgeを除去する
- challengeは存在するtargetNodeIdを参照する
- node削除時は紐づくchallengeを削除し、merge時はtargetへ付け替える
- 同じ親の表示順はnode.orderで決定する

### Projection

- 思考マップ: parentIdとorderを主ルートとして安定配置する
- ルート直下の枝を描画派生クラスタとして色分けする
- collapsedNodeIds配下の子孫と接続線を投影対象から外す
- 主ルート表示: parent hierarchyだけを表示する
- 全関係表示: 主ルートにtyped cross edgeを重ねる
- time / abstraction / socialReachはAI分析と出力用の属性として保持し、独立ビューにはしない
- viewStateにuser position lockがあるnodeは自動配置で動かさない

### Command application

- commandsはZod検証後、配列全体を1 transactionで適用する
- 途中で1 commandでも失敗した場合、全commandsを適用しない
- 適用前snapshotとinverse commandをhistoryへ保存する
- AI commandは`source: ai`、人間操作は`source: human`を持つ

### AI context selection

AI patchへ送る内容:

1. north star
2. active branchからrootまでのancestor
3. active branch配下の最大2階層
4. 選択ノードに紐づくchallenge / contradiction / promotion queue
5. 直近10 commands
6. 盤面全体の短いsummary

100 node全件は、ユーザーが全体再構成を承認した場合のみ送る。

## 4. API仕様

### POST `/api/unlock`

- Request: `{ "code": string }`
- 200: `{ "ok": true }` + HttpOnly Cookie
- 400: 入力なし
- 401: 不一致
- 429: rate limit

### POST `/api/map`

- Auth: signed access cookie
- Request: `{ input: string, locale: "ja" }`
- 200: `InitialMapResponse`
- 400: schema error、空入力、入力上限超過
- 401: access cookieなし
- 422: AI出力がschemaに合わずretry後も失敗
- 429: rate limit
- 502: provider error

### POST `/api/patch`

- Auth: signed access cookie
- Request: `{ message, context, recentCommands }`
- 200: `PatchResponse`
- `requiresApproval`はnorth star変更、全体再構成、locked対象操作でtrue
- エラー時は盤面を変更しない

## 5. 保存仕様

- IndexedDB store: `sessions`, `snapshots`, `preferences`
- human edit後: 500ms debounceでsession保存
- AI patch適用後: 即時snapshot作成
- snapshot上限: セッションあたり50。超過時は古い非checkpointから削除
- JSON exportにはschemaVersionを含める
- JSON importはmigration→validation→commitの順で行う

## 6. 出力仕様

### AIブリーフ

固定見出し:

1. 本筋
2. 現在地
3. 決定済み
4. 根拠・前提
5. 未解決の問い
6. Parking Lot
7. 関係・依存
8. 次の一歩
9. AIへの依頼

### JSON

- thinking graph、viewState、history metadata、schemaVersionを含む
- access code、AI key、Cookie、provider response raw bodyを含めない

### Markdown

- rootからparent hierarchyを箇条書き化
- typed cross edgesを別節へ出力

### XMind

- parent hierarchyをattached topicsへ変換
- node type glyph、detail、factsをnotesへ保存
- typed cross edgesはMVPではMarkdown notesにも残す

## 7. エラー・安全仕様

- AI出力を直接DOMへHTMLとして挿入しない
- import text、node statement、AI replyはescapeする
- provider raw errorとsecretをクライアントへ返さない
- body size、input length、command count、node countに上限を置く
- AI 1 responseのcommands上限は20。超過時は分割提案を返す
- root、本筋、locked nodeの破壊操作はapprovalなしで適用しない
