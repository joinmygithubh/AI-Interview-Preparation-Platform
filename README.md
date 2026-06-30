# 🧠 AI Interview Coach (InterviewAI)

![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)

A full-stack platform that runs AI-powered mock interviews tailored to your resume and target role, scores your answers in real time, and generates a downloadable PDF report.

## ✨ Features

- **Resume-aware interviews** — upload a PDF/DOCX résumé; it's parsed and used to tailor questions.
- **AI question generation** — a mix of technical, behavioral, and situational questions per role & difficulty.
- **Live interview session** — per-question timer, voice input (Web Speech API), and instant AI scoring with feedback, strengths, improvements, and an example answer.
- **Real-time scoring over Socket.IO** — JWT-authenticated sockets stream answer evaluations.
- **Dashboard & analytics** — score trend line chart, skills radar, streaks, and session history.
- **PDF reports** — a polished multi-page report rendered with Puppeteer and stored on Cloudinary.
- **Auth** — JWT-based registration/login with bcrypt-hashed passwords.
- **Dark mode**, responsive layout, skeleton loaders, and an error boundary.

## 🏗️ Architecture

```
                         ┌─────────────────────────┐
                         │        Client           │
                         │  React + Vite + Tailwind │
                         │   (nginx static host)    │
                         └───────────┬─────────────┘
                            REST + WebSocket (JWT)
                                     │
                         ┌───────────▼─────────────┐
                         │        Server           │
                         │  Node + Express + S.IO   │
                         └───┬───────┬───────┬──────┘
                             │       │       │
                ┌────────────▼─┐ ┌───▼────┐ ┌▼───────────┐
                │   MongoDB    │ │ OpenAI │ │ Cloudinary  │
                │  (Mongoose)  │ │  API   │ │ (files/PDF) │
                └──────────────┘ └────────┘ └─────────────┘
```

## 🚀 Getting started

```bash
# 1. Clone
git clone https://github.com/joinmygithubh/AI-Interview-Preparation-Platform.git
cd AI-Interview-Preparation-Platform

# 2. Configure environment
cp .env.example .env          # then fill in your keys (see below)

# 3. Install dependencies
cd server && npm install
cd ../client && npm install

# 4. Run in development (two terminals)
cd server && npm run dev      # http://localhost:5000
cd client && npm run dev      # http://localhost:5173
```

Required `.env` keys: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLIENT_URL`, and the `SMTP_*` / `FROM_EMAIL` values.

### 🐳 Run with Docker

```bash
docker compose up --build
# client → http://localhost  |  server → http://localhost:5000
```

## 📡 API endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/api/auth/register` | ❌ | Create an account, returns `{ user, token }` |
| POST | `/api/auth/login` | ❌ | Log in, returns `{ user, token }` |
| GET | `/api/auth/me` | ✅ | Current authenticated user |
| PUT | `/api/auth/profile` | ✅ | Update name / target role / experience level |
| GET | `/api/user/dashboard` | ✅ | Aggregated stats (totals, avg, best, streak, last 10) |
| POST | `/api/resume/upload` | ✅ | Upload & parse a résumé (PDF/DOCX) |
| GET | `/api/resume/list` | ✅ | List the user's résumés |
| DELETE | `/api/resume/:id` | ✅ | Delete a résumé |
| POST | `/api/interview/start` | ✅ | Generate questions & start a session |
| GET | `/api/interview/history` | ✅ | Paginated session history |
| GET | `/api/interview/:id` | ✅ | Full session with questions |
| PUT | `/api/interview/:id/answer` | ✅ | Score & save a single answer |
| POST | `/api/interview/:id/complete` | ✅ | Finalize session + AI summary |
| GET | `/api/report/:sessionId` | ✅ | Get or generate the PDF report URL |
| GET | `/api/health` | ❌ | Health check |

> Authenticated requests require an `Authorization: Bearer <token>` header. Real-time events (`join_session`, `submit_answer`, `end_session`, `typing`) run over Socket.IO with the JWT passed in the handshake `auth.token`.

## ☁️ Deploy to Render.com (free tier)

**Server — Web Service**
1. New → Web Service → connect this repo, root directory `server`.
2. Build command `npm install`, start command `node index.js`.
3. Add the environment variables from `.env` (set `CLIENT_URL` to your static site URL).
4. Use a managed MongoDB (e.g. MongoDB Atlas free tier) for `MONGODB_URI`.

**Client — Static Site**
1. New → Static Site → same repo, root directory `client`.
2. Build command `npm install && npm run build`, publish directory `dist`.
3. Set `VITE_API_URL` to your server URL + `/api`.
4. Add a rewrite rule `/* → /index.html` (200) for SPA routing.

> Note: PDF generation uses Puppeteer/Chromium. Render's free web service works with the provided `server/Dockerfile` (which installs Chromium); for the plain Node build you may need a Chromium buildpack or a paid instance with enough memory.

---

Built with Kiro. Contributions welcome.
