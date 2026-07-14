# テスト設計書: Spatial Thinking Companion

## 1. テスト戦略

- Unit: domain schema、command reducer、projection、mapping selection、exportsを中心に高密度で検証
- Integration: API schema、AI adapter、IndexedDB、import/export roundtrip
- Component: workspace、node editor、relation layer、challenge、patch preview、shortcuts
- E2E: 初期生成→手編集→AI patch→Undo→export/import
- Performance: 100 nodes / 150 edges fixtureで操作時間とrender安定性を確認
- Security: access code、signed cookie、rate limit boundary、secret非露出

## 2. 実装順序

1. Zod schemaとfixtures
2. command reducerとhistory
3. 主ルートprojectionと全関係layer
4. AI brief / JSON / Markdown / XMind exports
5. local persistence
6. React Flow workspace
7. AI Route Handlersとprovider adapter
8. access protectionとrate limit hook
9. E2E・performance

## 3. テストケース

| # | 対象 | テスト内容 | 種別 | 優先度 |
|---|---|---|---|---|
| U-01 | schema | 正しいThinkingGraphを受理する | Unit | Must |
| U-02 | schema | dangling edgeを拒否する | Unit | Must |
| U-03 | schema | certainty範囲外を拒否する | Unit | Must |
| U-04 | graph | parent cycleを検出する | Unit | Must |
| U-05 | commands | 複数commandをatomicに適用する | Unit | Must |
| U-06 | commands | 途中失敗時に元stateを保持する | Unit | Must |
| U-07 | commands | locked nodeへのAI更新をapproval対象にする | Unit | Must |
| U-08 | commands | node削除時にedgeも削除する | Unit | Must |
| U-09 | commands | node mergeでedgeを付け替える | Unit | Must |
| U-10 | history | apply→undoで同一stateへ戻る | Unit | Must |
| U-11 | history | undo→redoで適用後stateへ戻る | Unit | Must |
| U-12 | selector | 手順中心入力をroadmapへ分類する | Unit | Must |
| U-13 | challenge | 旧未解決データをnode別challengeへ移行する | Unit | Must |
| U-14 | challenge | node削除・統合時にchallenge参照を保つ | Unit | Must |
| U-15 | challenge | 回答と解決結果を履歴として保持する | Unit | Must |
| U-16 | projection | roadmapでparent hierarchyを保持する | Unit | Must |
| U-17 | projection | orderに従って兄弟ノードを配置する | Unit | Must |
| U-18 | projection | locked positionを自動layoutで維持する | Unit | Must |
| U-19 | brief | 固定9見出しを出力する | Unit | Must |
| U-20 | json | export→importでgraphを損失なく復元する | Integration | Must |
| U-21 | markdown | hierarchyとcross edgeを出力する | Unit | Should |
| U-22 | xmind | 有効なzip構造とroot topicを生成する | Integration | Should |
| I-01 | storage | sessionを保存・再読込する | Integration | Must |
| I-02 | storage | snapshot上限を維持する | Integration | Should |
| I-03 | API map | 正しいstructured responseを受理する | Integration | Must |
| I-04 | API map | 不正AI出力を422にする | Integration | Must |
| I-05 | API patch | active branch contextだけをproviderへ渡す | Integration | Must |
| I-06 | API patch | provider失敗で盤面を変更しない | Integration | Must |
| I-07 | auth | 不正codeでCookieを発行しない | Integration | Must |
| I-08 | auth | 正しいcodeでHttpOnly Cookieを発行する | Integration | Must |
| C-01 | workspace | 初期graphを1枚の思考マップで表示する | Component | Must |
| C-02 | workspace | 主ルート/全関係切替で配置を維持する | Component | Must |
| C-03 | editor | 人間編集でuserLockedを設定できる | Component | Must |
| C-04 | patch | approval対象commandを自動適用しない | Component | Must |
| C-05 | patch | patch差分を確認して適用できる | Component | Must |
| C-06 | challenge | nodeの検証課題へ回答して構造差分を生成する | Component | Must |
| C-07 | shortcut | Tab・Enter・Shift+Rがcanvas focus時だけ動く | Component | Must |
| E-01 | journey | 短文から初期ロードマップを作る | E2E | Must |
| E-02 | journey | 移動・統合後のAI応答が編集を保持する | E2E | Must |
| E-03 | journey | AI patchをUndoできる | E2E | Must |
| E-04 | journey | JSON export/importで作業を再開する | E2E | Must |
| E-05 | journey | AIブリーフをコピーできる | E2E | Must |
| P-01 | performance | 100 nodes / 150 edgesを表示する | Performance | Must |
| P-02 | performance | 100 nodesでrelation layerを切り替える | Performance | Must |
| S-01 | security | API keyがclient bundleに含まれない | Security | Must |
| S-02 | security | unauthenticated API requestを拒否する | Security | Must |
| S-03 | security | import/AI textをHTML実行しない | Security | Must |

## 4. Fixtures

- `minimal-roadmap`: 8 nodes / 8 edges
- `timespace-company-strategy`: 添付資料の1兆円・再現性・ソフトウェア・外部パートナー事例
- `conflicted-graph`: contradiction、assumption、promotionを含む20 nodes
- `large-graph`: 100 nodes / 150 edges、3階層、cross edge、cycle、locked positionを含む
- `invalid-dangling-edge`: 存在しないnodeへのedge
- `invalid-parent-cycle`: parent cycleを持つgraph

## 5. 完了条件

- MustのUnit / Integration / Componentが全件成功
- E2E主要5シナリオ成功
- large-graphでcrash・データ欠損・操作不能がない
- AI providerが無いローカル環境でもfixture demoとdomain testが動く
- 公開前にsecurity Mustが全件成功
