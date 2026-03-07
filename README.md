# 🌟 Hotaru（蛍）

> **人の愛が、地図を書き換える。**

旅先で出会った「たのしい」「うつくしい」「のこしたい」瞬間を写真と感情で記録すると、その場所が地図上に蛍の光として灯るトラベルPWAです。

---

## ✨ 主な機能

### 🗺️ 感情の地図
- 全国のスポットが感情カラーの蛍として地図上に浮かぶ
- **WebGL（Three.js）シェーダー**でリアルタイムに明滅・揺らぐ光を表現
- スポットをタップすると周囲に写真が円形に浮かび上がる
- ALLフィルター・MYフィルター・感情フィルター（たのしい🟠 / うつくしい🔵 / のこしたい🩷）

### 📸 旅の記録
- カメラで写真を撮影 → 3つの感情から選択 → Supabaseに保存
- Google Places APIで現在地のスポット名を自動取得
- 旅セッション（開始〜終了）ごとに記録を管理

### 🃏 カードアルバム
- 旅ごとに感情カードをアルバム表示
- **感情バー**でその旅の感情比率を可視化
- **蛍の森**：旅1件 = 蛍1匹、Canvas 2D APIで浮遊アニメーション

### 📊 旅のサマリー
- 旅終了時に感情円グラフ＋メッセージを表示

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|------|------|
| フレームワーク | Next.js 16.1.6（App Router）|
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 地図 | Leaflet + react-leaflet |
| 3D描画 | Three.js（WebGLシェーダー） |
| アニメーション | Framer Motion |
| バックエンド | Supabase（DB + Storage + Auth） |
| 認証 | Supabase Auth（Googleログイン）|
| PWA | next-pwa |
| デプロイ | Vercel |

---

## 🌟 技術的なこだわり

### 蛍の光（WebGL × GLSLシェーダー）
地図上の蛍はThree.jsのポイントスプライトとGLSLシェーダーで描画しています。全スポットを**1回のドローコール**で処理するため、スポット数が増えても軽快に動作します。

```glsl
// 明滅（sin波で自然なゆらぎ）
vAlpha = 0.9 + 0.1 * sin(uTime * 1.0 + aPhase);

// ガウシアン関数で光の滲みを表現
float glow = exp(-dist * dist * 2.5);
float core = exp(-dist * dist * 15.0) * vBrightness * 0.6;
```

### love_countで光の強さが変化
```typescript
// 愛を灯した人数が多いほど大きく明るく光る
const baseSize = Math.min(14 + Math.sqrt(spot.love_count) * 5, 90);
```

---

## 🚀 ローカル開発

### 必要なもの
- Node.js 18以上
- Supabaseアカウント
- Google Places API キー

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/hotaru.git
cd hotaru

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
```

`.env.local` に以下を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_PLACES_API_KEY=your_google_places_api_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いてください。

---

## 🗄️ データベース構成（Supabase）

| テーブル | 説明 |
|------|------|
| `trips` | 旅セッション（開始・終了・感情カウント）|
| `spots` | スポット情報（緯度経度・感情・love_count）|
| `loves` | 各記録（写真・感情・ユーザー）|
| `push_subscriptions` | プッシュ通知購読情報 |

---

## 📱 PWA対応

- ホーム画面への追加（iOS / Android）
- オフラインキャッシュ
- プッシュ通知（Web Push）

---

## 🎨 デザインコンセプト

| カラー | 用途 |
|------|------|
| `#0B1026` | 背景（深夜の空）|
| `#F59E0B` | ゴールド（アクセント）|
| `#F97316` | たのしい 🟠 |
| `#38BDF8` | うつくしい 🔵 |
| `#F472B6` | のこしたい 🩷 |

---

## 📄 ライセンス

MIT