# Native Ads

AI-powered native image ad generator. Describe your ad concept, Claude enhances it into a native-style prompt, and Google Nano Banana Pro generates the image.

## Stack

- **Next.js 16** + **Inter font**
- **AI Elements** + **shadcn/ui** for the chat UI
- **Claude Sonnet** (via AI SDK) for native ad prompt enhancement
- **Replicate** — `google/nano-banana-pro` for image generation
- **SQLite** (better-sqlite3) + **JWT** for self-hosted auth

## Setup

### 1. Configure environment variables

Edit `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
JWT_SECRET=some-long-random-string
ADMIN_EMAIL=your@email.com
DATABASE_URL=./data/app.db
```

### 2. Create your admin account

```bash
npm run setup:admin -- yourpassword
```

This creates an account for the email in `ADMIN_EMAIL`.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## How it works

1. **Sign in** at `/login` with your admin credentials
2. **Invite users** at `/admin` — generates a one-time invite URL
3. **Invited user** visits the URL, sets their name + password, then signs in
4. **Generate ads** — type a concept, Claude enhances it into a native-style prompt with the `[tags] iphone style, low-fi image` format, then Replicate generates the 4:5 image

## Generating ads

Input concept:
> Close-up of irritated, red skin texture along a jawline — visible bumps, blotchiness, the aftermath

Claude outputs:
> Close-up of irritated, red skin texture along a jawline — visible bumps, blotchiness, the aftermath [Gory/Visceral, Ultra Real, Suffering] iphone style, low-fi image

Then Nano Banana Pro generates the image with your chosen settings (aspect ratio, resolution, format, safety level).

## Model settings

All Replicate model parameters are exposed in the UI:
- **Aspect ratio**: 4:5 (default/native), 1:1, 3:4, 9:16, 16:9, 4:3, 3:2
- **Resolution**: 1K, 2K (default), 4K
- **Output format**: JPEG (default), PNG, WebP
- **Safety filter**: Low block (default), Medium block, High block
- **Fallback model**: Allow fallback to Seedream-5 if Nano Banana is at capacity
- **Reference images**: Attach up to 14 reference images for style/composition guidance
