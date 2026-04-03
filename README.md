# Event Buddy Map

A web app to find and join local study sessions on a map.

**Tech Stack:** Next.js 16 · Express.js · MongoDB Atlas · NextAuth.js · Leaflet · Cloudinary

---

## Features

- **Session Search** — Find nearby sessions by current location or address, displayed on a map and list
- **Session Creation** — Create sessions with title, date/time, location (with map preview), and approval settings
- **Join Requests** — Support for approval-required and instant-join sessions with optional message
- **Chat** — Real-time chat between session members
- **Notifications** — Notifications for join requests and approvals with unread badge
- **Account Management** — Profile photo (Cloudinary), session history, and incoming request management
- **Google Login** — Google OAuth 2.0 via NextAuth.js
- **Mobile Responsive** — Responsive UI supporting screens from 375px+

---

## Directory Structure

```
event-buddy-map/
├── src/                        # Next.js frontend (port 3000)
│   ├── app/                    # App Router pages
│   │   ├── sessions/           # Session list, detail, and creation
│   │   ├── me/                 # Account page
│   │   ├── notifications/      # Notifications page
│   │   ├── login/              # Login
│   │   ├── register/           # Registration
│   │   └── api/auth/           # NextAuth route handler
│   ├── components/             # Header, SessionsMap, PinMap, etc.
│   └── lib/                    # API client and auth utilities
└── apps/api/                   # Express REST API (port 3003)
    └── src/
        ├── models/             # Mongoose models
        ├── routes/             # API routes
        ├── middleware/         # JWT auth middleware
        └── lib/                # JWT utilities
```

---

## Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Google Cloud Console OAuth client (for Google login)
- Cloudinary account (for profile photos)

---

### 1. Clone the repository

```bash
git clone https://github.com/Atsuki-522/Buddy-app.git
cd Buddy-app
```

---

### 2. Configure backend environment variables

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env`:

```env
MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@cluster0.xxxxx.mongodb.net/study-buddy-dev?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=<random string of 32+ characters>
PORT=3003
```

> To generate a JWT_SECRET:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

### 3. Configure frontend environment variables

```bash
cd ../../
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3003

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your Cloudinary cloud name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your upload preset>

GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
NEXTAUTH_SECRET=<random string of 32+ characters>
NEXTAUTH_URL=http://localhost:3000
```

---

### 4. Install dependencies

```bash
# Frontend
npm install

# Backend
cd apps/api && npm install
```

---

### 5. Start the servers

**Backend (Terminal 1):**
```bash
cd apps/api
npm run dev
```

Expected output:
```
API listening on port 3003
MongoDB connected
Notification jobs started (interval: 60s)
```

**Frontend (Terminal 2):**
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Navigate to **APIs & Services** → **OAuth consent screen** and complete the setup
3. Go to **Credentials** → **Create Credentials** → **OAuth client ID** (Web application)
4. Add the following to **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Copy the client ID and secret into `.env.local`

> For production, add your production URL alongside the localhost URL.

---

## API Endpoints

### Auth `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register with email and password |
| POST | `/auth/login` | None | Login → returns JWT |
| POST | `/auth/google` | None | Google OAuth login / register |
| GET  | `/auth/me` | Required | Get current user profile |
| PATCH | `/auth/profile` | Required | Update profile photo URL |

### Sessions `/sessions`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sessions` | Required | Create a session |
| GET  | `/sessions?lat&lng&radiusKm&startAt&startsWithinHours&limit` | Optional | Search nearby sessions |
| GET  | `/sessions/mine?role=HOST\|MEMBER` | Required | Get own sessions |
| GET  | `/sessions/:id` | Optional | Get session detail (privateLocation hidden for non-members) |
| PATCH | `/sessions/:id` | Required (host) | Edit session |
| DELETE | `/sessions/:id` | Required (host) | Delete session |

### Join Requests `/join-requests`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST  | `/sessions/:id/join-requests` | Required | Send join request or join instantly |
| GET   | `/sessions/:id/join-requests?status=PENDING` | Required (host) | List join requests |
| GET   | `/join-requests/mine` | Required | Get own join requests |
| PATCH | `/join-requests/:rid/approve` | Required (host) | Approve request |
| PATCH | `/join-requests/:rid/deny` | Required (host) | Deny request |

### Chat `/sessions/:id/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/sessions/:id/messages` | Required (member) | Get messages |
| POST | `/sessions/:id/messages` | Required (member) | Send a message |

### Notifications `/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET   | `/notifications` | Required | List notifications |
| GET   | `/notifications/unread-count` | Required | Get unread count |
| PATCH | `/notifications/:id/read` | Required | Mark as read |
| DELETE | `/notifications/:id` | Required | Delete notification |

### Account `/me`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me/incoming-requests` | Required | List incoming join requests |
| GET | `/me/history` | Required | Get past session history |

---

## Security

- `.env` and `.env.local` are excluded from git via `.gitignore` and will never be committed
- Use development-only database credentials locally — store production credentials in your hosting provider's environment variables
- Always use strong random values for `JWT_SECRET` and `NEXTAUTH_SECRET`
