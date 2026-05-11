# Deployment Guide - School Operations Module

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Port 6080 (frontend), 8000 (main backend), 5001 (school-ops), 5432 (PostgreSQL) available

### One-Command Deployment
```bash
cd Sponsorship_Management_Dashboard
docker compose up -d --build
```

Check status:
```bash
docker ps
```

## Service Endpoints

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| Frontend | http://localhost:6080 | 6080 | React application |
| Main API | http://localhost:8000 | 8000 | Students, Donors, Sponsorships, Leaves, Admin |
| School Ops API | http://localhost:5001 | 5001 | Class, Attendance, Curriculum, Exams |
| Database | localhost | 5432 | PostgreSQL 16 |

## Access Application

1. Open browser: **http://localhost:6080**
2. Login with admin credentials (if first time, check backend logs for seed user)
3. Navigate to **School Operations** from sidebar (after admin enables module for user)

## Environment Variables

### Main Backend (.env)
```
DATABASE_URL=postgres://sombhabona_user:SombhabonaDev123!@db:5432/sombhabona_db
API_PREFIX=/api/v1
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost
```

### School Operations Backend (.env)
Located in `school-operations-backend/.env`:
```
PORT=5001
DB_HOST=sombhabona-db
DB_PORT=5432
DB_USER=sombhabona_user
DB_PASSWORD=SombhabonaDev123!
DB_NAME=sombhabona_db
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

## Container Details

### sombhabona-db (PostgreSQL)
- Image: postgres:16-alpine
- Volume: postgres_data
- Health Check: pg_isready enabled
- Migrations: Applied automatically

### sombhabona-backend
- Image: Node.js 22 Alpine
- Startup: Auto-initializes main schema + auth schema
- Files: Backend source, SQL migrations

### sombhabona-school-ops (NEW)
- Image: Node.js 18 Alpine
- Startup: Auto-initializes school operations schema
- Files: School ops source, SQL schema
- API: Port 5001

### sombhabona-frontend
- Image: Node.js 22 (build) + Nginx (serve)
- Build: Vite production build
- Nginx Config: Reverse proxy with API routing
- Port: 80 (mapped to 6080)

## Database Initialization

### Automatic (On Container Start)
All schemas are created automatically:
1. `backend/sql/schema.sql` - Main tables
2. `backend/sql/auth_schema.sql` - Auth & modules
3. `school-operations-backend/sql/schema.sql` - School ops tables

### Manual (If Needed)
```bash
# Connect to database
docker exec -it sombhabona-db psql -U sombhabona_user -d sombhabona_db

# Run schema
\i /sql/schema.sql
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker logs -f sombhabona-school-ops
docker logs -f sombhabona-backend
docker logs -f sombhabona-frontend
docker logs -f sombhabona-db
```

### Check Health
```bash
# Container status
docker compose ps

# Detailed health
docker inspect sombhabona-db --format='{{.State.Health}}'
```

## Common Issues & Solutions

### Issue: School Operations API not responding
```bash
# Check if running
docker ps | grep school-ops

# Check logs for errors
docker logs sombhabona-school-ops

# Verify DB connection
docker exec sombhabona-school-ops ping sombhabona-db

# Restart service
docker compose restart school-operations-backend
```

### Issue: Database connection refused
```bash
# Check DB is healthy
docker compose logs sombhabona-db

# Verify credentials in .env
cat .env

# Check if database exists
docker exec sombhabona-db psql -U sombhabona_user -l
```

### Issue: Frontend shows blank page
```bash
# Check frontend logs
docker logs sombhabona-frontend

# Verify nginx config
docker exec sombhabona-frontend cat /etc/nginx/conf.d/default.conf

# Rebuild frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Issue: Module not showing in navigation
- Ensure user has "School Operations" module permission
- Go to Admin → Users → Edit User → Enable "School Operations"
- Refresh page after enabling

## Development Mode

### Local Development (Without Docker)
```bash
# Terminal 1: Start backend
cd backend
npm install
npm run dev

# Terminal 2: Start school-ops backend
cd school-operations-backend
pnpm install
pnpm dev

# Terminal 3: Start frontend
npm install
npm run dev
```

### With Docker for Database Only
```bash
# Run only database
docker compose up -d db

# Then run backends locally
cd backend && npm run dev
cd school-operations-backend && pnpm dev

# In another terminal, start frontend
npm run dev
```

## Updating Services

### Update Code
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

### Update Database Schema
```bash
# Edit SQL files
# vim backend/sql/schema.sql
# vim school-operations-backend/sql/schema.sql

# Restart services to apply
docker compose restart
```

### Update Environment Variables
```bash
# Edit .env file
vim .env

# Update school-ops .env
vim school-operations-backend/.env

# Restart services
docker compose up -d
```

## Backup & Restore

### Backup Database
```bash
docker exec sombhabona-db pg_dump -U sombhabona_user sombhabona_db > backup.sql
```

### Restore Database
```bash
docker exec -i sombhabona-db psql -U sombhabona_user sombhabona_db < backup.sql
```

### Backup Volumes
```bash
docker run --rm -v sponsorship_management_dashboard_postgres_data:/data \
  -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## Performance Optimization

### Database Indexes
All critical queries have indexes (already created in schema):
- Class routines by class, day, period
- Attendance by teacher-date
- Exam schedules by date
- Activities by due date

### API Caching (Optional)
Consider adding Redis for:
- Class schedule caching
- Attendance summaries
- Exam schedule cache

### Frontend Optimization
- Code splitting with dynamic imports
- Lazy loading components
- Service worker for offline support

## Production Deployment

### Production docker-compose.yml
```yaml
version: '3.9'
services:
  db:
    restart: always
    environment:
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
  backend:
    restart: always
    environment:
      NODE_ENV: production
  school-operations-backend:
    restart: always
    environment:
      NODE_ENV: production
  frontend:
    restart: always
```

### Production Checklist
- [ ] Update all .env files with production values
- [ ] Set NODE_ENV=production in all services
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure monitoring/alerts
- [ ] Enable database replication
- [ ] Set resource limits in docker-compose

### SSL/HTTPS Setup
```yaml
frontend:
  environment:
    - SSL_CERT=/etc/nginx/certs/cert.pem
    - SSL_KEY=/etc/nginx/certs/key.pem
  volumes:
    - /path/to/certs:/etc/nginx/certs
```

## Troubleshooting Checklist

- [ ] All ports available (6080, 8000, 5001, 5432)
- [ ] Docker daemon running
- [ ] Sufficient disk space
- [ ] Environment variables set correctly
- [ ] Database initialization complete
- [ ] Network connectivity between containers
- [ ] No conflicting processes on ports
- [ ] File permissions correct
- [ ] Latest Docker version

## Support

For issues or questions:
1. Check logs: `docker logs [container-name]`
2. Review error messages in browser console
3. Check database connectivity
4. Verify environment variables
5. Check GitHub issues or documentation
