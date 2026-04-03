# Event Buddy Map

地域の勉強会・もくもく会を地図で探して参加申請できる Web アプリ。

**Tech Stack:** Next.js 16 · Express.js · MongoDB Atlas · NextAuth.js · Leaflet · Cloudinary

---

## 機能一覧

- **セッション検索** — 現在地または住所名から半径指定で近くのセッションを地図＋リストで表示
- **セッション作成** — タイトル・日時・場所（地図プレビュー付き）・承認設定
- **参加申請** — 承認制／即時参加に対応、申請メッセージ送信
- **チャット** — セッションメンバー間のリアルタイムチャット
- **通知** — 参加申請・承認の通知、未読バッジ表示
- **アカウント管理** — プロフィール写真（Cloudinary）、参加履歴、受信申請の管理
- **Google ログイン** — NextAuth.js 経由の Google OAuth 2.0
- **モバイル対応** — 375px〜のスマートフォンに対応したレスポンシブ UI

---

## ディレクトリ構成

```
event-buddy-map/
├── src/                        # Next.js フロントエンド (port 3000)
│   ├── app/                    # App Router ページ
│   │   ├── sessions/           # セッション一覧・詳細・作成
│   │   ├── me/                 # アカウントページ
│   │   ├── notifications/      # 通知ページ
│   │   ├── login/              # ログイン
│   │   ├── register/           # 新規登録
│   │   └── api/auth/           # NextAuth ルートハンドラ
│   ├── components/             # Header, SessionsMap, PinMap 等
│   └── lib/                    # API クライアント・認証ユーティリティ
└── apps/api/                   # Express REST API (port 3003)
    └── src/
        ├── models/             # Mongoose モデル
        ├── routes/             # API ルート
        ├── middleware/         # JWT 認証ミドルウェア
        └── lib/                # JWT ユーティリティ
```

---

## セットアップ

### 前提条件

- Node.js 20+
- MongoDB Atlas アカウント
- Google Cloud Console OAuth クライアント（Google ログインを使う場合）
- Cloudinary アカウント（プロフィール写真を使う場合）

---

### 1. リポジトリをクローン

```bash
git clone https://github.com/Atsuki-522/Buddy-app.git
cd Buddy-app
```

---

### 2. バックエンドの環境変数を設定

```bash
cd apps/api
cp .env.example .env
```

`apps/api/.env` を編集：

```env
MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@cluster0.xxxxx.mongodb.net/study-buddy-dev?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<ランダムな32文字以上の文字列>
PORT=3003
```

> JWT_SECRET の生成例:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### 3. フロントエンドの環境変数を設定

```bash
cd ../../   # ルートに戻る
cp .env.local.example .env.local
```

`.env.local` を編集：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3003

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<Cloudinary クラウド名>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<アップロードプリセット名>

GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth クライアントシークレット>
NEXTAUTH_SECRET=<ランダムな32文字以上の文字列>
NEXTAUTH_URL=http://localhost:3000
```

---

### 4. 依存パッケージをインストール

```bash
# フロントエンド
npm install

# バックエンド
cd apps/api && npm install
```

---

### 5. 起動

**バックエンド（ターミナル1）:**
```bash
cd apps/api
npm run dev
```

起動確認:
```
API listening on port 3003
MongoDB connected
Notification jobs started (interval: 60s)
```

**フロントエンド（ターミナル2）:**
```bash
# ルートディレクトリで
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

---

## Google OAuth 設定

1. [Google Cloud Console](https://console.cloud.google.com) でプロジェクトを作成
2. **API とサービス** → **OAuth 同意画面** を設定
3. **認証情報** → **OAuth クライアント ID** を作成（ウェブアプリケーション）
4. 承認済みリダイレクト URI に追加:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. クライアント ID とシークレットを `.env.local` に設定

> 本番環境では `http://localhost:3000/...` の代わりに本番 URL を追加してください。

---

## API エンドポイント一覧

### 認証 `/auth`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| POST | `/auth/register` | 不要 | メール・パスワードで新規登録 |
| POST | `/auth/login` | 不要 | ログイン → JWT 返却 |
| POST | `/auth/google` | 不要 | Google OAuth ログイン／登録 |
| GET  | `/auth/me` | 必須 | 自分のプロフィール取得 |
| PATCH | `/auth/profile` | 必須 | プロフィール写真 URL 更新 |

### セッション `/sessions`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| POST | `/sessions` | 必須 | セッション作成 |
| GET  | `/sessions?lat&lng&radiusKm&startAt&startsWithinHours&limit` | 任意 | 近傍検索 |
| GET  | `/sessions/mine?role=HOST\|MEMBER` | 必須 | 自分のセッション一覧 |
| GET  | `/sessions/:id` | 任意 | 詳細（非メンバーは privateLocation=null） |
| PATCH | `/sessions/:id` | 必須（host） | セッション編集 |
| DELETE | `/sessions/:id` | 必須（host） | セッション削除 |

### 参加申請 `/join-requests`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| POST  | `/sessions/:id/join-requests` | 必須 | 申請作成 / 即入会 |
| GET   | `/sessions/:id/join-requests?status=PENDING` | 必須（host） | 申請一覧 |
| GET   | `/join-requests/mine` | 必須 | 自分の申請一覧 |
| PATCH | `/join-requests/:rid/approve` | 必須（host） | 承認 |
| PATCH | `/join-requests/:rid/deny` | 必須（host） | 却下 |

### チャット `/sessions/:id/messages`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| GET  | `/sessions/:id/messages` | 必須（member） | メッセージ一覧 |
| POST | `/sessions/:id/messages` | 必須（member） | メッセージ送信 |

### 通知 `/notifications`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| GET   | `/notifications` | 必須 | 通知一覧 |
| GET   | `/notifications/unread-count` | 必須 | 未読件数 |
| PATCH | `/notifications/:id/read` | 必須 | 既読にする |
| DELETE | `/notifications/:id` | 必須 | 通知を削除 |

### アカウント `/me`

| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| GET | `/me/incoming-requests` | 必須 | 受信した参加申請一覧 |
| GET | `/me/history` | 必須 | 過去のセッション履歴 |

---

## セキュリティ

- `.env` / `.env.local` は `.gitignore` により **コミットされません**
- 本番の DB 認証情報はホスティングサービスの環境変数に設定し、ローカルには開発用 DB の認証情報のみ使用してください
- `JWT_SECRET` と `NEXTAUTH_SECRET` は必ず強いランダム値を使用してください
