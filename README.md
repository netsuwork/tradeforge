# TradeForge Academy — Full Stack Deployment Guide

## Project Structure
```
tradeforge-fullstack/
├── backend/          → Deploy to Render
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   ├── package.json
│   └── .env.example
└── frontend/         → Deploy to Vercel
    ├── index.html    (login/signup page)
    ├── app.html      (main academy app)
    └── vercel.json
```

---

## STEP 1 — Push to GitHub

1. Go to github.com → New repository → Name it "tradeforge"
2. Upload ALL files from this folder (keep frontend/ and backend/ folders)
3. Make the repository public

---

## STEP 2 — Deploy Backend to Render

### 2a. Create PostgreSQL Database
1. Go to render.com → Sign up free
2. Click "New +" → PostgreSQL
3. Name: tradeforge-db
4. Plan: Free
5. Click "Create Database"
6. Copy the "External Database URL" — you'll need it

### 2b. Deploy the API
1. On Render → "New +" → Web Service
2. Connect your GitHub repo
3. Set Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Plan: Free

### 2c. Set Environment Variables on Render
Under your web service → Environment → Add these:

| Key | Value |
|-----|-------|
| DATABASE_URL | (paste your PostgreSQL External URL from step 2a) |
| JWT_SECRET | (any long random string, e.g. "xK9#mP2$qL7@nR4&wT6") |
| NODE_ENV | production |
| FRONTEND_URL | https://your-tradeforge.vercel.app (fill in after step 3) |

7. Click "Create Web Service"
8. Wait for deploy — copy your Render URL (e.g. https://tradeforge-api.onrender.com)

---

## STEP 3 — Deploy Frontend to Vercel

1. Go to vercel.com → Sign up free
2. "Add New Project" → Import your GitHub repo
3. Set Root Directory: `frontend`
4. Click Deploy

### 3a. Set Your Backend URL
After deploying, open `index.html` and `app.html` and replace:
```
https://YOUR-BACKEND.onrender.com
```
with your actual Render URL from Step 2.

Or better — in Vercel → Settings → Environment Variables, add:
| Key | Value |
|-----|-------|
| NEXT_PUBLIC_API_URL | https://your-backend.onrender.com |

Then redeploy.

---

## STEP 4 — Update FRONTEND_URL on Render

Go back to Render → Your API service → Environment → Update FRONTEND_URL
with your actual Vercel URL. Redeploy.

---

## DONE! Your app is live 🎉

- Login page: https://your-tradeforge.vercel.app
- Users can sign up, log in, and their progress is saved permanently

---

## Notes

- Render free tier spins down after 15 min of inactivity (cold start ~30 sec)
- Upgrade to Render Starter ($7/mo) to keep it always on
- The PostgreSQL free tier on Render expires after 90 days — export data before then
- For production, consider Supabase (free PostgreSQL, no expiry) as the database

## Quick Test After Deploy
1. Open your Vercel URL
2. Click "Create Account"  
3. Fill in name, email, password → should redirect to the academy
4. Complete a lesson → check that progress is saved (refresh page to verify)
