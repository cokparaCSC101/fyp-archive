# FYP Archive System — Web Application

**A Cross-Platform Final Year Project Archive and Retrieval System**
Case Study: Computer Science Department, Pan-Atlantic University

This repository contains the **web** side of the project: a React.js web application
backed by a shared Node.js/Express REST API and a MySQL database. The same backend
will later serve the React Native mobile application.

---

## Tech stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Frontend  | React.js (Vite), React Router, Axios        |
| Backend   | Node.js, Express                            |
| Database  | MySQL                                        |
| Auth      | JSON Web Tokens (JWT), bcrypt password hashing |

---

## Project structure

```
fyp-archive/
├── backend/                 Node.js + Express REST API
│   ├── config/db.js         MySQL connection pool
│   ├── controllers/         Request handlers (auth, projects, supervisors)
│   ├── middleware/auth.js   JWT verification + admin guard
│   ├── routes/              Route definitions
│   ├── db/schema.sql        Database schema (3 tables)
│   ├── db/seed.sql          Sample data + default accounts
│   └── server.js            App entry point
└── frontend/                React.js web application
    ├── src/api/             Axios client
    ├── src/context/         Auth context (session state)
    ├── src/components/      Navbar, cards, form, pagination, etc.
    ├── src/pages/           Login, Register, Browse, Detail, Admin
    └── src/index.css        Design system + all styling
```

---

## Prerequisites

- **Node.js** 18 or newer
- **MySQL** 8.x (or MariaDB 10.4+) running locally

---

## Setup — step by step

### 1. Database

Create the schema and load the sample data. From the `backend/` folder:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p fyp_archive < db/seed.sql
```

This creates the `fyp_archive` database with three tables (`supervisors`, `users`,
`projects`) and seeds it with 4 supervisors, 7 sample projects, and two accounts:

| Role    | Email                 | Password     |
| ------- | --------------------- | ------------ |
| Admin   | `admin@pau.edu.ng`    | `Admin@123`  |
| Student | `student@pau.edu.ng`  | `Student@123`|

> Change these passwords before any real deployment.

### 2. Backend API

```bash
cd backend
npm install
cp .env.example .env        # then edit .env with your MySQL credentials + a JWT secret
npm run dev                 # starts on http://localhost:5000
```

You should see `✓ MySQL connected` and `✓ Server running on http://localhost:5000`.

### 3. Frontend web app

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env        # default points at http://localhost:5000/api
npm run dev                 # starts on http://localhost:5173
```

Open **http://localhost:5173** and sign in with the admin account above.

---

## API endpoints

| Method | Endpoint              | Access        | Description                              |
| ------ | --------------------- | ------------- | ---------------------------------------- |
| POST   | `/api/auth/register`  | Public        | Create an account                        |
| POST   | `/api/auth/login`     | Public        | Sign in, returns a JWT                   |
| GET    | `/api/projects`       | Authenticated | List projects (paginated, keyword + year filter) |
| GET    | `/api/projects/:id`   | Authenticated | Get a single project                     |
| POST   | `/api/projects`       | Admin only    | Add a project                            |
| PUT    | `/api/projects/:id`   | Admin only    | Edit a project                           |
| DELETE | `/api/projects/:id`   | Admin only    | Delete a project                         |
| GET    | `/api/supervisors`    | Authenticated | List supervisors                         |

**List query parameters:** `?page=1&limit=9&keyword=<text>&year=<yyyy>`

---

## Roles & permissions

- **Administrator** — full create / edit / delete on projects, plus everything below.
- **Student, Lecturer, Head of Department** — read-only: browse, search, view details.

These rules are enforced both in the UI (route guards) and on the server (every write
endpoint checks for the `admin` role), so the API stays secure even if the UI is bypassed.

---

## Deployment notes

- **Backend** → Render (Web Service). Set the environment variables from `.env`, and
  point `DB_*` at a hosted MySQL instance (e.g. Railway, PlanetScale, or Render's MySQL).
- **Frontend** → Vercel or Render (Static Site). Run `npm run build`; set
  `VITE_API_URL` to the deployed backend URL (e.g. `https://your-api.onrender.com/api`).

---

Built for the Final Year Project of Clinton Okpara, supervised by Solomon Alile,
School of Science and Technology, Pan-Atlantic University.
