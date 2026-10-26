# InsightAI — Production Deployment Guide

InsightAI is architected for zero-friction cloud deployment. The frontend and backend can be hosted together or decoupled across modern cloud platforms.

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS (Served via Nginx or Vercel CDN)
- **Backend**: FastAPI + Python 3.11/3.13 + Uvicorn ASGI + LangGraph
- **Database**: PostgreSQL (Production) or SQLite (Local/Edge)
- **AI Engine**: Google Gemini API (`gemini-2.5-flash-lite` or `gemini-1.5-flash`)

---

## Option 1: Automated 1-Click Deployment on Render (Recommended)

Render offers free tier hosting for Python web services, static frontend apps, and managed PostgreSQL databases.

### Step 1: Push your Code to GitHub
```bash
git add .
git commit -m "Initial commit for production deployment"
git remote add origin https://github.com/Saurav1603/InsightAI.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Blueprint on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New > Blueprint**.
2. Connect your GitHub repository.
3. Render will read [render.yaml](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/render.yaml) and automatically create:
   - **`insightai-db`**: Managed PostgreSQL Database
   - **`insightai-backend`**: FastAPI Web Service
   - **`insightai-frontend`**: Static Web App with automatic SPA rewrites
4. In the Environment Variables screen:
   - Fill in `GEMINI_API_KEY`: Your Google Gemini API Key.
5. Click **Apply**. Render will build and deploy the entire platform with HTTPS enabled.

---

## Option 2: Vercel (Frontend) + Render / Railway (Backend)

For blazing fast global CDN performance for your React frontend:

### Backend on Render / Railway
1. Create a new **Web Service** pointing to your repository root.
2. Build Command: `pip install -r backend/requirements.txt`
3. Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: Your production PostgreSQL URL (e.g. from Supabase, Neon, or Render).
   - `SECRET_KEY`: Random 64-character string.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
5. Copy your deployed backend URL: `https://insightai-backend.onrender.com`.

### Frontend on Vercel
1. Import your repository into [vercel.com](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Add Environment Variable:
   - `VITE_API_URL`: `https://insightai-backend.onrender.com`
4. Deploy. Vercel uses [frontend/vercel.json](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/frontend/vercel.json) to handle React client-side routing.

---

## Option 3: VPS / Linux Server (Ubuntu 22.04 / 24.04 with Docker)

### Step 1: Install Docker & Compose on your VPS
```bash
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
```

### Step 2: Clone & Configure
```bash
git clone https://github.com/YOUR_USERNAME/insightai.git
cd insightai
cp .env.example .env
nano .env
```
Fill in your `GEMINI_API_KEY` and strong `SECRET_KEY`.

### Step 3: Run with Docker Compose
```bash
docker-compose up -d --build
```
Your app will be live at:
- Frontend: `http://YOUR_SERVER_IP:5173`
- Backend API Docs: `http://YOUR_SERVER_IP:8000/docs`

---

## Option 4: Instant Public URL for Demo / Presentation (Cloudflare Tunnel)

To present the working application live from your local machine with free HTTPS and no port-forwarding:

### Using Cloudflare Quick Tunnel:
```bash
# In terminal, install cloudflared or run:
npx localtunnel --port 5173
```
or with Ngrok:
```bash
ngrok http 5173
```
This generates an instant public HTTPS URL (e.g. `https://insightai-demo.loca.lt`) accessible from anywhere.
