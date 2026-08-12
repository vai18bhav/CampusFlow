# CampusFlow Database Documentation

- **Database Engine**: MySQL 8.0+
- **Strict Server Port**: 3307 (`DB_PORT=3307`)
- **Database Name**: `campusflow_db`

## Initialization & Seeding
From the `backend` directory, run:
```bash
npm run init-db
```
This executes `database/schema.sql` (creating 21 normalized tables) and `database/seed.sql` (populating demo accounts for all 6 roles with real bcrypt password hashes).
