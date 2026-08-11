# Ramadan Tournament Registration Platform

A production-ready registration system for **Fariq Al-Rawdha** Ramadan sports competitions. Players register without creating an account. Administrators manage registrations, control site availability, and export an official Word report.

Built as a complete full-stack product: public Arabic RTL interface, secured admin dashboard, REST API, and cloud deployment on Render.

---

## Project overview

The platform solves a real operational problem: collecting player registrations for football and volleyball during Ramadan, then producing a clean printable record for organizers.

Public users land on a branded welcome screen, open the registration form, and submit a five-part Arabic name, phone number, captain status, and sport choice. Duplicate five-part names are rejected. Phone numbers may repeat.

Administrators authenticate, open or lock registration, search or delete players, add records manually, and download a professionally formatted `.docx` file.

---

## Features

### Public registration
- Arabic RTL landing page with tournament branding
- Five-part name validation (four names + tribe)
- Unique full-name enforcement
- Football, volleyball, or both
- Success and closed-registration states

### Admin dashboard
- Username / password login with JWT
- Open or lock the public site instantly
- Search, add, delete, and bulk-delete players
- Statistics for captains and sports
- Microsoft Word export (no tables; one player per section)

### Operations
- SQLite for local development
- PostgreSQL on Render for persistent production data
- Environment-based secrets
- Health check endpoint for deployment

---

## Technologies used

| Layer | Stack |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript, RTL layout |
| Backend | Node.js, Express.js |
| Databases | SQLite (local), PostgreSQL (production) |
| Auth | bcrypt, JSON Web Tokens |
| Export | `docx` (Open XML Word documents) |
| Hosting | Render Web Service + Render PostgreSQL |

---

## System architecture

```text
Browser (RTL UI)
    │
    ▼
Express static files + REST API
    │
    ├── /api/auth        admin login
    ├── /api/players     registration + admin CRUD + Word export
    └── /api/settings    public/admin site settings
    │
    ▼
Data layer
    ├── SQLite           when DATABASE_URL is not set
    └── PostgreSQL       when DATABASE_URL is set (Render)
```

The frontend talks only to `/api`. Admin routes require a Bearer token. Public registration is open unless administrators lock the site.

---

## Installation

```bash
git clone https://github.com/<your-username>/fariq-alrawdha.git
cd fariq-alrawdha/backend
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
npm start
```

Open [http://localhost:3000](http://localhost:3000)

Default local admin (development only):

- Username: `admin`
- Password: `changeme`

Change these values in `.env` before any real use.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Server port. Render injects this automatically. |
| `NODE_ENV` | Yes in production | `development` or `production` |
| `JWT_SECRET` | Yes in production | Signing key for admin tokens |
| `DATABASE_URL` | Yes in production | PostgreSQL connection string |
| `ADMIN_USERNAME` | Yes in production | Admin login name |
| `ADMIN_PASSWORD` | Yes in production | Admin login password |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `8h` |

Never commit `.env`. Use `.env.example` as the template.

---

## Database setup

### Local
If `DATABASE_URL` is empty, the API creates `database/tournament.db` (SQLite) and seeds settings plus the admin user.

### Production
Set `DATABASE_URL` to the Render Postgres connection string. Tables are created on startup:

- `admins`
- `players` (unique full name)
- `settings`

---

## Deployment (Render)

1. Push this repository to GitHub.
2. In Render, create a Blueprint from `render.yaml`, or create a Web Service + PostgreSQL manually.
3. Keep the web service and database in the **same region**.
4. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and confirm `DATABASE_URL` / `JWT_SECRET`.
5. Start command: `node backend/server.js`
6. Health check: `/api/health`

If logs show `getaddrinfo ENOTFOUND dpg-xxxxx-a`, the internal hostname is not resolving. Put both services in the same region, or paste the **External Database URL** into `DATABASE_URL`.

---

## Screenshots

> Add screenshots here before sharing the repository with recruiters.

- Landing page (tournament title + Register button)
- Registration form (Arabic RTL)
- Admin dashboard (players list + lock/open controls)
- Word export sample

Place images in `docs/screenshots/` if you add them later.

---

## Future improvements

- SMS confirmation after successful registration
- Role-based staff accounts
- Team grouping and match scheduling
- PDF export in addition to Word
- Automated tests (API + validation)
- Custom domain and HTTPS certificate management

---

## License

Private / portfolio project. Update this section if you publish the source under an open-source license.
