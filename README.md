# Free Intern — Student Internship Discovery & Career Readiness Platform

**Discover Internships. Build Skills. Start Your Career.**

Free Intern is a full-stack React 19 + TypeScript + Express + D3.js + Google Gemini AI platform that helps students discover verified private, government, and PM Internship Scheme opportunities, check deterministic eligibility, scan resumes ethically, practice 15-question role-specific mock interviews with D3.js progress visualization, and earn verified skill badges.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   ```
   *(You can optionally set `GEMINI_API_KEY` in `.env`. The platform includes a deterministic fallback engine so all features work out-of-the-box even without an API key.)*

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   - Automatically detects if port `3000` is in use and seamlessly switches to the next available port (`3001`, `3002`, etc.) without crashing.
   - Vite WebSocket / HMR is bound to the HTTP server to prevent port `24678` conflicts.
   - To manually terminate any orphaned background processes occupying port 3000, simply run:
     ```bash
     npm run kill-port
     ```
   Open [http://localhost:3000](http://localhost:3000) (or [http://localhost:3000/?autostart=1](http://localhost:3000/?autostart=1) for automatic demo student login).

4. **Run unit tests & linting:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

## Deploying to Vercel

The repository is pre-configured with [`vercel.json`](./vercel.json) and a Serverless Function handler in [`api/index.ts`](./api/index.ts).

### Option 1: Deploy via Vercel Web Dashboard (Recommended)
1. Push your repository to **GitHub** or **GitLab**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your `free-intern` repository.
4. Vercel automatically detects the framework settings from `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. *(Optional)* In **Environment Variables**, add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: *(Your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey))*
6. Click **Deploy**. Your app will be live at `https://your-project.vercel.app`!

### Option 2: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

## Demo Accounts
- **Student:** `student@freeintern.edu` / `Student@123`
- **Admin:** `admin@freeintern.edu` / `Admin@123`

See **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** for the complete 16-module functional specification, system architecture, and algorithm documentation.

