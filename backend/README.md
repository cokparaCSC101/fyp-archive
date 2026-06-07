# FYP Archive — Backend API

Node.js + Express REST API with MySQL and JWT authentication.

## Run locally
```bash
npm install
cp .env.example .env   # edit with your MySQL credentials + JWT secret
npm run dev            # http://localhost:5000
```

## Database setup
```bash
mysql -u root -p < db/schema.sql
mysql -u root -p fyp_archive < db/seed.sql
```

See the top-level README.md for the full endpoint list and default login credentials.
