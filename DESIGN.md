# DESIGN: Spatial Thinking Companion

## Direction

**静かな航海図**。XMindの速さ、製図台の精密さ、紙に思考を書き込む落ち着きを合わせる。AIが主役の画面ではなく、人間とAIが同じ地図を見る作業台にする。

## One memorable thing

画面中央の盤面が常に「いまどの時間・高さ・枝にいるか」を示し、ビューを切り替えても同じノードが場所を変えながら生き続ける。

## Palette

```css
--paper: #f4f1e8;
--paper-raised: #fbfaf6;
--ink: #1c2b3a;
--ink-soft: #556170;
--line: #c7c2b6;
--line-strong: #8f897c;
--decision: #c2402a;
--future: #3f7350;
--question: #a8791c;
--structure: #2e4b9b;
--blind-spot: #6d5478;
--focus: #0d7c86;
```

純白、ネオン紫、青紫グラデーション、全面ダークモードを使わない。

## Typography

- Display / section: `Shippori Mincho`。本筋、見出し、重要な問いに使用
- Interface / body: `Noto Sans JP`。密度の高いUIでも読みやすくする
- Data / IDs: `Geist Mono`。座標、型、確度、履歴に限定
- 日本語本文 line-height: 1.65以上
- ノード本文: 12〜14px、見出し: 16〜20px。盤面では巨大見出しを使わない

## Layout

- デスクトップ: 左320px / 中央可変 / 右300pxの3ペイン
- 左はチャットとセッション、中央は盤面、右は現在地と分析
- ペイン境界は1pxの実線。カードを積み重ねない
- 中央盤面は紙色＋薄い方眼。背景装飾はグリッドだけ
- 主要操作は盤面上部の一本のtoolbarへ集約
- 右パネルは選択対象がない時も、現在地・未解決・昇格候補を表示する

## Node language

- 本筋: 濃紺の角丸ではない矩形、白文字、太い輪郭
- 決定: 朱色の矩形、★
- 問い: 黄土の円形寄り、?
- 仮説・案: 青い輪郭、淡い青背景
- 未来: 緑の輪郭
- 盲点: 白背景、濃紺破線、¬
- Parking Lot: 灰色、低コントラスト、破線
- 選択中: focus色の二重輪郭。glowは使わない

## Motion

- 初期生成: ノードを親から子へ120ms間隔で出現
- 差分更新: 追加は短いink pulse、変更は輪郭を2回点滅
- ビュー切替: ノードの同一性がわかる250msの位置補間
- 常時動くアニメーションは禁止

## Interaction

- Enter: 兄弟ノード、Tab: 子ノード、Shift+Tab: 親へ戻す
- Cmd/Ctrl+Enter: チャット送信
- Space+drag: pan、wheel/pinch: zoom
- 直接編集はdouble clickまたはEnter
- AI変更は差分表示後に適用。人間編集は即時反映＋Undo
- すべての主要操作はkeyboardで到達可能

## Do

- 盤面を主役にする
- 型・確度・時間・抽象度を必要時だけ段階表示する
- 空状態、生成中、失敗、差分確認を設計する
- 大規模graphでは折り畳みと現在枝focusを優先する
- 日本語ラベルが切れない可変幅nodeを使う

## Don't

- 丸角カードのグリッドをダッシュボードのように並べない
- AIチャットを画面全体の主役にしない
- nodeすべてへ影・gradient・iconを付けない
- 同じ情報を左・中央・右へ重複表示しない
- すべての分析結果を常時展開しない
- 配置変更を装飾として無視しない

## Accessibility

- 色だけでnode型を区別せず、glyphとshapeを併用
- focus-visibleを明示
- text contrast 4.5:1以上
- reduced motionで位置補間以外のanimationを停止
- toolbar、tabs、dialog、treeへ適切なARIAとkeyboard操作を付ける
