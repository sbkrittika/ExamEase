# ExamEase.
AI-Powered University Exam Management System

## Local setup

Install dependencies from the project root, then initialize the local MySQL database:

```powershell
npm install
npm install --prefix backend
npm install --prefix Frontend
npm run db:setup
```

The setup script uses the installed MySQL Server 8.4, creates an isolated database directory at `backend/mysql-data-local`, creates the `examease` database, and imports `examease.sql`. It does not use the bundled MariaDB data files.

The supplied sample data is tracked in `database/samples`. Import it with `npm run data:import` to load the 385 students, 12 courses, 12 rooms, enrollments, and seat-plan positions.

Start the services in separate terminals:

```powershell
npm run backend
npm run frontend
```

Open `http://127.0.0.1:5173/`. The API runs at `http://127.0.0.1:5000/`.
