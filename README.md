# Saathi - Matrimony Web App

A full-stack matrimony platform inspired by Shaadi.com / Jeevansathi.com. Users can register, build detailed profiles with photos and partner preferences, search/filter matches, send/accept/decline interests, and chat in real time.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + MongoDB + Socket.io**. Runs in any modern browser (Chrome, Edge, Firefox, Safari).

---

## Features

- Email/password authentication (JWT in HTTP-only cookie)
- Detailed user profiles: basics, education/career, lifestyle, family, bio, photos
- Photo upload (up to 6 per user, JPG/PNG/WEBP, 5 MB each, stored in `public/uploads`)
- Advanced search with filters: age, height, religion, mother tongue, marital status, education, city, country, free-text
- Smart match scoring (0-100) based on partner preferences
- Send / Accept / Decline / Withdraw interests
- Real-time 1-on-1 chat (Socket.io) - only enabled after a mutual "accepted" interest
- Read receipts and typing indicators
- In-app notifications (interest received/accepted/declined, message received, profile view)
- Self-service account deletion
- Mobile-responsive UI

---

## Prerequisites - install these first

You don't have Node.js or MongoDB installed yet. Install both:

### 1. Node.js (v18.18 or newer)

Download the LTS installer from https://nodejs.org and run it. After install, **open a new PowerShell window** and verify:

```powershell
node -v
npm -v
```

Both should print version numbers. If `npm` still isn't found, restart your computer once.

### 2. MongoDB - pick ONE option

**Option A - MongoDB Atlas (free, cloud-hosted, easiest):**
1. Sign up at https://www.mongodb.com/cloud/atlas (free tier, no credit card)
2. Create a free **M0 cluster**
3. Add a database user (Database Access -> Add New Database User)
4. Allow access from anywhere (Network Access -> Add IP Address -> `0.0.0.0/0`)
5. Click **Connect -> Drivers**, copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Append a database name: `.../matrimony?retryWrites=...`

**Option B - Local MongoDB (Windows installer):**
1. Download from https://www.mongodb.com/try/download/community
2. Install with default options (it will run as a Windows service)
3. Use connection string `mongodb://127.0.0.1:27017/matrimony`

---

## Setup (one time)

```powershell
cd C:\Users\sachina\Music\matrimony

# 1) Install dependencies
npm install

# 2) Create your local env file
copy .env.example .env.local

# 3) Edit .env.local - set MONGODB_URI and a long random JWT_SECRET.
#    Generate a secret quickly:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`.env.local` should look like:

```
MONGODB_URI=mongodb+srv://you:password@cluster0.xxx.mongodb.net/matrimony?retryWrites=true&w=majority
JWT_SECRET=put-the-random-string-from-step-3-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

### (Optional) Seed demo data

```powershell
npm run seed
```

This wipes existing data and creates ~32 demo users, all with password `Password123`. You can immediately login as `alice@example.com` or `bob@example.com`.

---

## Run the app

```powershell
npm run dev
```

Open **http://localhost:3000** in Chrome. That's it.

The app uses a custom Node server (`server.ts`) that runs Next.js and Socket.io together on the same port.

---

## Project structure

```
matrimony/
  app/
    (app)/                 # Authenticated pages (require login)
      dashboard/           # Home with recommendations & activity
      search/              # Browse & filter matches
      profile/             # My profile, edit, photos, view others
      interests/           # Sent / Received / Connected
      messages/            # Conversations + chat window
    api/
      auth/                # register, login, logout, me, delete-account
      profile/             # update own profile, view others
      upload/              # photo upload & delete
      search/              # filtered search with match scoring
      interests/           # send / accept / decline / withdraw
      messages/            # conversation list & messages
      notifications/       # list & mark as read
    login/                 # public login page
    register/              # public register page
    page.tsx               # public landing page
  components/              # Navbar, ProfileCard, etc.
  lib/                     # mongodb, auth (JWT), api helpers, matchScore, constants
  models/                  # Mongoose schemas
  scripts/seed.ts          # demo data seeder
  server.ts                # Custom Next.js + Socket.io server
  public/uploads/          # User-uploaded photos
```

---

## Deploying to the cloud

Because chat uses **persistent WebSocket connections**, you must deploy on a platform that supports long-lived connections. **Vercel does NOT** (its serverless functions cap at ~30s). Use one of:

### Render (recommended, free tier available)

1. Push this repo to GitHub.
2. Go to https://render.com -> New -> Web Service -> Connect your repo.
3. Settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Environment variables:** add `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL` (your https URL). `PORT` is provided by Render automatically.
4. Deploy. Anyone can now visit your https URL in Chrome.

### Railway

Same as above (`railway up` or connect GitHub). Set the same env vars.

### Fly.io

Use a `fly.toml` with `internal_port = 3000`. Requires Docker; ask if you need a Dockerfile.

### Photo storage in production

The default upload handler writes to `public/uploads/`, which works on Render's persistent disk and Railway volumes, but **resets on each deploy** on platforms with ephemeral filesystems. For a real production app, swap `app/api/upload/route.ts` to upload to **Cloudinary**, **AWS S3**, or **UploadThing** (URLs go in `User.photos[]` exactly the same way).

---

## How chat is wired

- Custom server (`server.ts`) creates an HTTP server, attaches Next.js as the request handler, and attaches Socket.io on path `/api/socket`.
- Every socket connection is authenticated via the same JWT cookie used by REST APIs.
- Each authenticated user joins their own private room (`user:<userId>`).
- Sending a message:
  - Client emits `chat:send { to, body }`.
  - Server verifies an `accepted` Interest exists between the two parties.
  - Server stores in MongoDB and broadcasts `chat:message` to both participants' rooms.
  - Server creates a `message_received` Notification for the recipient.
- Typing indicator: `chat:typing { to, typing }`.
- Read receipts: `chat:read { peer }` updates `readAt` and emits to the peer.

---

## Common questions

**Q: Where do I open this from Chrome?**
After `npm run dev`, open `http://localhost:3000`. After cloud deploy, open the https URL your provider gives you.

**Q: How do I delete my account?**
Login -> Profile -> Account panel -> "Delete account" -> type `DELETE` to confirm. This wipes the user document.

**Q: How do I add real email/SMS notifications?**
Add a Resend, SendGrid, or Twilio call in the places where `Notification.create(...)` is invoked (e.g. `app/api/interests/route.ts`).

**Q: Can I add Google login, OTP login, or paid memberships?**
Yes - swap `lib/auth.ts` for **NextAuth.js** to add OAuth, and add Stripe for subscriptions.

---

## Safety reminder

Never share financial information with profiles you meet here. Verify identities through video calls before meeting in person.

---

## License

MIT - use freely.
