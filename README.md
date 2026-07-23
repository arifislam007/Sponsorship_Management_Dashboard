
  # Sponsorship Management Dashboard


  This project implements a full-stack Sponsorship Management Dashboard for Sombhabona Foundation, based on the provided Figma design.

  ## Tech Stack

  - Frontend: React + Vite + Tailwind CSS
  - Backend: Node.js + Express + pg
  - Database: PostgreSQL
  - Deployment: Docker + Docker Compose + Nginx

  ## Core Features

  - Dashboard summary API for total students, total donors, and monthly revenue
  - Student gallery API with sponsorship status filter
  - Ledger add-entry API with automatic closing balance calculation
  - Donor statement export service for CSV/PDF by month/year
  - Student card grid UI and accounting ledger with credit/debit color coding
  - Sidebar + branded footer with Bangla slogan: বঞ্চিত শিশুও আগামীর সম্ভাবনা

  ## Project Structure

  - Frontend source: `src/`
  - Backend source: `backend/src/`
  - PostgreSQL schema: `backend/sql/schema.sql`
  - Docker compose setup: `docker-compose.yml`

  ## Local Frontend Development

  1. Install dependencies:
    - `npm install`
  2. Run frontend dev server:
    - `npm run dev`

  ## Run Full Stack With Docker

  1. Create an environment file from `.env.example`:
    - `copy .env.example .env`
  2. Update secure DB credentials in `.env`.
  3. Start all services:
    - `docker compose up --build`
  4. Access:
    - Frontend: `http://localhost`
    - Backend health: `http://localhost:8000/health`

  ## API Endpoints (Node.js/Express)

  - `GET /api/v1/dashboard/summary`
  - `GET /api/v1/students?sponsored=all|sponsored|unsponsored`
  - `POST /api/v1/students`
  - `GET /api/v1/donors`
  - `POST /api/v1/donors`
  - `GET /api/v1/sponsorships`
  - `POST /api/v1/sponsorships`
  - `GET /api/v1/ledger/entries`
  - `GET /api/v1/ledger/summary`
  - `POST /api/v1/ledger/entries`
  - `POST /api/v1/exports/donor-statement`
  
