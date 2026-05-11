# ICT Module Backend

Backend service for the ICT module with student profile and admission form management.

## Features

- **Student Profiles**: Create and manage student ICT profiles
- **Admission Forms**: Handle admission applications
- **Course Management**: Track courses and enrollments

## Installation

```bash
cd ict-backend
pnpm install
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=sombhabona_user
DB_PASSWORD=sombhabona_pass
DB_NAME=sombhabona_db
JWT_SECRET=your_jwt_secret_key_here
PORT=5002
NODE_ENV=development
```

## Running Locally

```bash
npm start
```

Or with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Students
- `GET /api/ict/students` - Get all students
- `GET /api/ict/students/:id` - Get student by ID
- `POST /api/ict/students` - Create new student
- `PATCH /api/ict/students/:id` - Update student

### Admissions
- `GET /api/ict/admissions` - Get all admissions
- `GET /api/ict/admissions/:id` - Get admission by ID
- `POST /api/ict/admissions` - Create new admission
- `PATCH /api/ict/admissions/:id/status` - Update admission status

## Docker

The service runs in a Docker container on port 5002 (default).
