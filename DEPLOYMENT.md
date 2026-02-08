# CodeSync – GitHub & Deployment Guide

Follow these steps to put your project on GitHub and deploy it so anyone can use it.

---

## Part 1: Push to GitHub

### 1. Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click **“+”** → **“New repository”**.
3. Name it (e.g. `CodeSync` or `codesync-react`).
4. Leave it **empty** (no README, no .gitignore).
5. Click **Create repository**.

### 2. Push your code from your PC

Open **PowerShell** or **Command Prompt** in your project folder and run:

```powershell
cd "c:\Users\RAHUL\OneDrive\Desktop\CodeSync-React Project"

git init
git add .
git commit -m "Initial commit: CodeSync real-time collaborative editor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and the repo name you created.

If GitHub asks for login, use a **Personal Access Token** instead of your password (Settings → Developer settings → Personal access tokens).

### If `git add .` says "Unable to create index.lock" or "File exists"

A lock file is stuck (often due to OneDrive or a crashed Git command). Do this:

1. **Close** Cursor/VS Code, all terminals, and any app using this folder.
2. **Delete the lock file** using one of these:

   **Option A – File Explorer**
   - Open the project folder: `C:\Users\RAHUL\OneDrive\Desktop\CodeSync-React Project`
   - In the ribbon, enable **View → Show → Hidden items**
   - Open the **`.git`** folder
   - Delete the file **`index.lock`** (if it’s there)
   - If you can’t delete it (e.g. “in use”), restart the PC and delete it again

   **Option B – PowerShell (run as Administrator)**
   - Right‑click **PowerShell** → **Run as administrator**
   - Run:
   ```powershell
   Remove-Item "C:\Users\RAHUL\OneDrive\Desktop\CodeSync-React Project\.git\index.lock" -Force -ErrorAction SilentlyContinue
   ```
3. Open a **new** terminal in the project folder and run `git add .` again.

---

## Part 2: Deploy so anyone can use it

The app has two parts:

- **Backend** (Node + Socket.io) – run on **Render** (free).
- **Frontend** (React) – run on **Vercel** (free).

Deploy **backend first**, then frontend.

### Step A: Deploy backend on Render

1. Go to [render.com](https://render.com) and sign up (free).
2. **New** → **Web Service**.
3. Connect your GitHub account and select the repo you just pushed.
4. Use these settings:
   - **Name:** `codesync-backend` (or any name).
   - **Runtime:** `Node`.
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free.
5. Click **Create Web Service**.
6. Wait until it shows **Live** and copy the URL, e.g.  
   `https://codesync-backend-xxxx.onrender.com`  
   You will use this as the backend URL for the frontend.

### Step B: Deploy frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free).
2. **Add New** → **Project**.
3. Import the **same GitHub repo**.
4. Use these settings:
   - **Framework Preset:** Create React App.
   - **Root Directory:** `./` (leave as is).
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Environment variable:**  
     Name: `REACT_APP_BACKEND_URL`  
     Value: `https://YOUR-RENDER-URL.onrender.com`  
     (the backend URL from Step A, **no trailing slash**).
5. Click **Deploy**.
6. When it finishes, Vercel gives you a link like `https://your-project.vercel.app`. That is your **live app link** to share.

---

## Summary

| What              | Where   | URL you get                          |
|-------------------|--------|--------------------------------------|
| Code              | GitHub | `https://github.com/you/repo-name`   |
| Backend (API)     | Render | `https://xxxx.onrender.com`          |
| Frontend (app)    | Vercel | `https://your-project.vercel.app` ← **Share this** |

Share the **Vercel URL** so anyone can open the app in the browser. The frontend will talk to your backend on Render automatically.

---

## Optional: Custom domain

- **Vercel:** In the project → Settings → Domains you can add your own domain.
- **Render:** Free tier uses `*.onrender.com`; custom domain is on paid plans.

---

## If something breaks

- **“Connection failed” in the app:**  
  Check that `REACT_APP_BACKEND_URL` in Vercel matches your Render backend URL exactly (https, no trailing slash).

- **Render backend sleeps on free tier:**  
  First load can take 30–60 seconds. After that it stays awake for a while.

- **C++ not running on Render:**  
  Render’s free Node environment may not have `g++`. JavaScript will work; C++ might need a different backend setup or a service that supports compilers.
