# School Operations Module 📚

A comprehensive microservice built as a separate Docker container for managing all school operations including class routines, curriculum activities, teacher attendance, and exam schedules.

## 🎯 Features

### 1. **Class Routines with Teacher Schedule** 📅
Manage and organize the weekly class schedule with detailed period-wise assignments.

**Features:**
- Create and manage classes
- Add teacher-subject assignments
- Design weekly timetables with period times
- Assign specific rooms for classes
- View schedules by day or entire week
- Track teacher assignments

**API Endpoints:**
```
GET    /api/school-operations/classes
GET    /api/school-operations/classes/:id
POST   /api/school-operations/classes
PUT    /api/school-operations/classes/:id
DELETE /api/school-operations/classes/:id

GET    /api/school-operations/routines/class/:classId
GET    /api/school-operations/routines/class/:classId/day/:day
POST   /api/school-operations/routines
PUT    /api/school-operations/routines/:id
DELETE /api/school-operations/routines/:id
```

### 2. **School Curriculum Activities Record** 📖
Track all curriculum activities including assignments, projects, tests, and practical work.

**Features:**
- Create curriculum activities (assignments, projects, tests, practicals)
- Track activity completion status and percentage
- Set due dates and assign to teachers
- Filter activities by status
- View upcoming activities (next 7 days)
- Add notes and descriptions

**API Endpoints:**
```
GET    /api/school-operations/activities/class/:classId
GET    /api/school-operations/activities/class/:classId/status/:status
GET    /api/school-operations/activities/:id
GET    /api/school-operations/activities/upcoming/:classId
POST   /api/school-operations/activities
PUT    /api/school-operations/activities/:id
DELETE /api/school-operations/activities/:id
```

### 3. **Teacher Attendance Tracking** ✓
Comprehensive teacher attendance management system with working hours calculation.

**Features:**
- Daily attendance marking (Present, Absent, Leave, Late)
- Check-in/check-out time tracking
- Automatic working hours calculation
- Attendance summary by month
- Attendance percentage calculations
- Remarks and notes support
- Attendance statistics dashboard

**API Endpoints:**
```
GET    /api/school-operations/attendance/date/:date
GET    /api/school-operations/attendance/teacher/:teacherId
POST   /api/school-operations/attendance
PUT    /api/school-operations/attendance/:id
DELETE /api/school-operations/attendance/:id

GET    /api/school-operations/attendance-summary/teacher/:teacherId/:month/:year
POST   /api/school-operations/attendance-summary/calculate/:month/:year
```

### 4. **Exam Schedule Planner** 📝
Plan and manage exam schedules with detailed exam information.

**Features:**
- Create and manage exams (midterm, final, unit tests, etc.)
- Schedule exams for classes
- Set exam date, time, duration, and total marks
- Assign invigilators
- Track exam status
- Record exam results
- Grade management
- Exam result analytics

**API Endpoints:**
```
GET    /api/school-operations/exams
GET    /api/school-operations/exams/:id
POST   /api/school-operations/exams
PUT    /api/school-operations/exams/:id
DELETE /api/school-operations/exams/:id

GET    /api/school-operations/schedules/exam/:examId
GET    /api/school-operations/schedules/class/:classId
GET    /api/school-operations/schedules/upcoming/:classId
POST   /api/school-operations/schedules
PUT    /api/school-operations/schedules/:id
DELETE /api/school-operations/schedules/:id

GET    /api/school-operations/results/schedule/:scheduleId
GET    /api/school-operations/results/student/:studentId
POST   /api/school-operations/results
PUT    /api/school-operations/results/:id
DELETE /api/school-operations/results/:id
```

## 🏗️ Architecture

The School Operations Module is built as a **separate microservice** with its own:
- **Backend Service**: Node.js + Express running on port 5001
- **Database**: Shares PostgreSQL database with main application
- **Docker Container**: Isolated containerization (`sombhabona-school-ops`)

### Technology Stack
- **Backend**: Node.js 18 (Alpine), Express.js
- **Database**: PostgreSQL 16
- **Frontend**: React + TypeScript, Vite
- **Container**: Docker (separate service in docker-compose)
- **API**: RESTful API with JSON

## 📦 Database Schema

### Tables
1. **classes** - School classes/sections
2. **teachers** - Teacher information and status
3. **class_teacher_assignments** - Teacher-to-class subject assignments
4. **class_routines** - Weekly class schedule/timetable
5. **curriculum_activities** - Assignment, project, test records
6. **teacher_attendance** - Daily attendance tracking
7. **teacher_attendance_summary** - Monthly attendance summaries
8. **exams** - Exam definitions (midterm, final, etc.)
9. **exam_schedules** - Scheduled exams per class
10. **exam_results** - Student exam results and grades

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- PostgreSQL 16 (runs in Docker)

### Installation & Setup

1. **Build and Start Services**
```bash
cd Sponsorship_Management_Dashboard
docker compose up -d --build
```

2. **Check Service Status**
```bash
docker ps
```

You should see:
- `sombhabona-db` - PostgreSQL database
- `sombhabona-backend` - Main application backend
- `sombhabona-school-ops` - School Operations microservice
- `sombhabona-frontend` - Frontend application

3. **Access the Application**
- Frontend: http://localhost:6080
- School Operations API: http://localhost:5001/api/school-operations

### Initial Setup

1. Log in to the application with admin credentials
2. Navigate to **School Operations** from the sidebar
3. Start by creating classes and adding teachers
4. Build your class routines and curriculum activities
5. Begin tracking attendance and exam schedules

## 💡 Usage Examples

### Add a Class
```bash
curl -X POST http://localhost:5001/api/school-operations/classes \
  -H "Content-Type: application/json" \
  -d '{
    "class_name": "Class 10-A",
    "description": "Science Stream",
    "capacity": 40
  }'
```

### Add a Teacher
```bash
curl -X POST http://localhost:5001/api/school-operations/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Mr. John Doe",
    "email": "john@school.edu",
    "specialization": "Mathematics",
    "qualification": "M.Sc in Mathematics"
  }'
```

### Create a Class Routine
```bash
curl -X POST http://localhost:5001/api/school-operations/routines \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "day_of_week": "Monday",
    "period_number": 1,
    "start_time": "09:00",
    "end_time": "10:00",
    "subject": "Mathematics",
    "teacher_id": 1,
    "room_number": "101"
  }'
```

### Mark Teacher Attendance
```bash
curl -X POST http://localhost:5001/api/school-operations/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": 1,
    "attendance_date": "2026-05-09",
    "status": "present",
    "check_in_time": "09:00",
    "check_out_time": "17:00",
    "remarks": "All good"
  }'
```

### Create Curriculum Activity
```bash
curl -X POST http://localhost:5001/api/school-operations/activities \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "activity_name": "Chapter 5 Assignment",
    "subject": "Mathematics",
    "activity_type": "assignment",
    "assigned_date": "2026-05-09",
    "due_date": "2026-05-15",
    "status": "pending"
  }'
```

### Schedule an Exam
```bash
curl -X POST http://localhost:5001/api/school-operations/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "exam_id": 1,
    "class_id": 1,
    "subject": "Mathematics",
    "exam_date": "2026-05-20",
    "start_time": "09:00",
    "end_time": "11:00",
    "duration_minutes": 120,
    "total_marks": 100,
    "room_number": "101"
  }'
```

## 🔐 Permissions & Access Control

The School Operations module integrates with the main application's role-based access control system:

- **Admin**: Full access to all features
- **Accountant**: Can view attendance and curriculum (restricted by permission)
- **Operator**: Can view and create activities (restricted by permission)
- **School Operations Module Access**: Users must have the "School Operations" module enabled

### User Module Access
Users can be granted specific module access via the Admin panel:
1. Go to **Settings** → **Users**
2. Select a user and click **Edit**
3. Enable/disable "School Operations" module access

## 📊 Database Indexes

All major query patterns are optimized with indexes:
- Class routine queries by class, day, period
- Curriculum activity queries by class, due date
- Attendance queries by teacher and date
- Exam schedule queries by exam, class, date

## 🛠️ Troubleshooting

### School Operations container not starting
```bash
# Check logs
docker logs sombhabona-school-ops

# Verify database connection
docker exec sombhabona-school-ops node -e "console.log('Database test')"

# Rebuild container
docker compose up -d --build school-operations-backend
```

### API endpoints not responding
```bash
# Check if service is running
docker ps | grep sombhabona-school-ops

# Check environment variables
docker exec sombhabona-school-ops env | grep DB_
```

### Database schema not initialized
```bash
# Check database schema
docker exec sombhabona-db psql -U sombhabona_user -d sombhabona_db -c "\dt"

# Manually run schema
docker exec -i sombhabona-db psql -U sombhabona_user -d sombhabona_db < school-operations-backend/sql/schema.sql
```

## 📝 File Structure

```
school-operations-backend/
├── src/
│   ├── server.js              # Main Express server
│   ├── db.js                  # Database connection
│   └── routes/
│       ├── classRoutines.js   # Class and routine endpoints
│       ├── teachers.js        # Teacher management
│       ├── curriculum.js      # Curriculum activities
│       ├── attendance.js      # Attendance tracking
│       └── exams.js           # Exam scheduling
├── sql/
│   └── schema.sql            # Database schema
├── package.json
├── Dockerfile
└── .env.example
```

## 🔄 Deployment

### Development
```bash
cd school-operations-backend
pnpm install
pnpm dev
```

### Production (Docker)
```bash
docker compose -f docker-compose.yml up -d
```

### Environment Variables
Create `.env` file in `school-operations-backend/`:
```
PORT=5001
DB_HOST=sombhabona-db
DB_PORT=5432
DB_USER=sombhabona_user
DB_PASSWORD=SombhabonaDev123!
DB_NAME=sombhabona_db
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production
```

## 📞 Support & Documentation

For more information about the Sponsorship Management Dashboard and its modules, please refer to the main [README.md](../README.md)

## ✨ Features Coming Soon

- Bulk import for teachers and exams (CSV/Excel)
- Automated attendance reports
- Exam result analytics and charts
- Parent portal for exam results
- Mobile app integration
- Email notifications for attendance
- SMS alerts for exam schedules
- Integration with student grades

---

**School Operations Module** - Comprehensive school management solution | Part of Sponsorship Management Dashboard
