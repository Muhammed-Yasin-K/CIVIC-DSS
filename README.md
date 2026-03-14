# 🏙️ CIVIC-DSS
## A Spatial-Temporal Analysis and Prediction of Civic Risks Using Machine Learning

> An AI-powered civic decision support system that applies spatial-temporal analysis and machine learning to predict, monitor, and manage civic risks across city zones.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Database Setup & Seeding](#database-setup--seeding)
- [API Reference](#api-reference)
- [ML Models](#ml-models)
- [Frontend Pages](#frontend-pages)
- [Email Notifications](#email-notifications)
- [Default Credentials](#default-credentials)

---

## Overview

**CIVIC-DSS** — *A Spatial-Temporal Analysis and Prediction of Civic Risks Using Machine Learning* — is a full-stack web application developed as an MCA final year project. It is designed for municipal governments to proactively detect, predict, and manage civic infrastructure risks using a combination of spatial analysis, time-series forecasting, and explainable AI.

The system integrates machine learning models (XGBoost + ARIMA) with real-time geospatial data to deliver risk forecasts, recurring hotspot detection, task deployment, field inspections, and automated alerts — all through an intuitive role-based dashboard.

Core research contributions:
- **Spatial analysis** — DBSCAN clustering to identify recurring civic risk hotspots on an interactive city map
- **Temporal forecasting** — ARIMA(5,1,0) for predicting complaint volume trends globally and per region
- **Risk classification** — XGBoost multi-class classifier scoring complaints as Low / Medium / High / Critical
- **Explainability** — SHAP feature attribution to interpret individual predictions
- **Decision support workflow** — Role-based Admin → Officer pipeline with email-driven task deployment

---

## Key Features

| Feature | Description |
|---|---|
| 🔮 **Risk Prediction** | XGBoost model scores civic complaints by risk level (Low / Medium / High / Critical) |
| 📈 **ARIMA Forecasting** | Time-series forecasting of complaint volumes — global and per region |
| 🗺️ **Hotspot Mapping** | Interactive Leaflet map with DBSCAN-clustered civic hotspots |
| 🚨 **Alert System** | Auto-generated alerts for high-risk areas, auto-resolved on task/inspection completion |
| 📋 **Task Management** | Admins deploy tasks to officers; officers track and complete them |
| 🔍 **Inspections** | Field inspection workflow with status tracking and completion reports |
| 📅 **Event Management** | Strategic event registration that affects risk multipliers |
| 👥 **User Management** | Admin controls for creating, assigning, and managing officers |
| 🗺️ **Zone Management** | City divided into North/South/East/West/Central regions with sub-zones |
| 📊 **Analytics Dashboard** | Charts and metrics for civic trends, complaint categories, and resolution rates |
| 📄 **PDF Reports** | Auto-generated PDF reports for inspections and task completions |
| 🧠 **SHAP Explainability** | Feature importance visualization explaining model risk predictions |
| 📬 **Email Notifications** | Automated SMTP emails to officers on deployment and admins on completion |
| 🗂️ **Audit Logs** | Full action trail for all admin/officer operations |
| 📚 **Knowledge Base** | Internal knowledge articles for officers |
| 🛠️ **Model Configuration** | Admin panel to tune risk thresholds and view model performance metrics |
| 💬 **Support / Helpdesk** | In-app support ticket system |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                  │
│         Vite + React 19 + Leaflet + Recharts        │
│              http://localhost:5173                  │
└────────────────────┬────────────────────────────────┘
                     │ REST API (Axios)
                     ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                  │
│          Python 3.11 + Uvicorn + Beanie             │
│              http://localhost:8000                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │  Auth    │  │   API    │  │   ML Pipeline     │ │
│  │  JWT     │  │  Routes  │  │  XGBoost + ARIMA  │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Services │  │  Email   │  │   SHAP Explain    │ │
│  │  Layer   │  │  SMTP    │  │   + Risk Scorer   │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ Motor (async)
                     ▼
┌─────────────────────────────────────────────────────┐
│              MongoDB Atlas (Cloud)                  │
│           Database: civic_risk_db                   │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Core runtime |
| FastAPI | 0.104.1 | REST API framework |
| Uvicorn | 0.24.0 | ASGI server |
| Beanie | 1.23.6 | MongoDB ODM (async) |
| Motor | 3.3.2 | Async MongoDB driver |
| PyMongo | 4.6.0 | MongoDB client |
| XGBoost | 2.0.2 | Risk classification model |
| Scikit-learn | 1.3.2 | ML utilities & preprocessing |
| Statsmodels | 0.14.1 | ARIMA time-series forecasting |
| SHAP | 0.44.0 | ML explainability |
| Pandas | 2.1.3 | Data manipulation |
| NumPy | 1.26.2 | Numerical computing |
| python-jose | 3.3.0 | JWT authentication |
| passlib + bcrypt | 1.7.4 | Password hashing |
| aiosmtplib | 3.0.1 | Async email (SMTP) |
| fpdf2 | 2.7.7 | PDF generation |
| geopy | 2.4.1 | Geospatial calculations |
| httpx / aiohttp | latest | HTTP clients |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| Vite | 7.x | Build tool & dev server |
| React Router | 7.x | Client-side routing |
| Axios | 1.x | HTTP requests |
| Leaflet + React-Leaflet | 1.9 / 5.0 | Interactive maps |
| Recharts | 3.x | Charts & data visualization |
| Framer Motion | 12.x | Animations |
| Lucide React | latest | Icon library |
| TailwindCSS | 3.x | Utility CSS styling |

---

## User Roles

The system uses **role-based access control (RBAC)** with three roles:

```
┌──────────┬────────────────────────────────────────────────────────────┐
│  Role    │  Permissions                                               │
├──────────┼────────────────────────────────────────────────────────────┤
│ ADMIN    │ Full access: manage users, zones, events, tasks,           │
│          │ inspections, view all analytics, configure ML models,      │
│          │ view audit logs, manage knowledge base                     │
├──────────┼────────────────────────────────────────────────────────────┤
│ OFFICER  │ View assigned tasks & inspections, complete tasks,         │
│          │ submit inspection reports, view alerts for their zones,    │
│          │ access knowledge base, raise support tickets               │
└──────────┴────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Main_Project/
├── START.bat                    # One-click launcher (Windows)
├── README.md                    # This file
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── api/v1/              # All API route handlers
│   │   │   ├── auth.py          # Login, token, password reset
│   │   │   ├── users.py         # User CRUD
│   │   │   ├── zones.py         # Zone management
│   │   │   ├── alerts.py        # Alert CRUD
│   │   │   ├── tasks.py         # Task deployment & management
│   │   │   ├── inspections.py   # Inspection workflow
│   │   │   ├── events.py        # Strategic event management
│   │   │   ├── predictions.py   # ML risk prediction endpoints
│   │   │   ├── analytics.py     # Dashboard analytics
│   │   │   ├── hotspots.py      # Hotspot data endpoints
│   │   │   ├── reports.py       # Report generation
│   │   │   ├── risk_analysis.py # Risk analysis endpoints
│   │   │   ├── knowledge_base.py# Knowledge articles
│   │   │   ├── audit_logs.py    # Audit trail
│   │   │   ├── config.py        # System configuration
│   │   │   ├── models.py        # ML model info endpoints
│   │   │   └── support.py       # Support tickets
│   │   │
│   │   ├── models/              # MongoDB document models (Beanie)
│   │   │   ├── user.py, zone.py, alert.py, task.py
│   │   │   ├── inspection.py, event.py, hotspot.py
│   │   │   ├── prediction.py, report.py, forecast.py
│   │   │   └── audit_log.py, knowledge_base.py, support.py
│   │   │
│   │   ├── services/            # Business logic layer
│   │   │   ├── prediction_service.py   # XGBoost inference
│   │   │   ├── forecast_service.py     # ARIMA forecasting
│   │   │   ├── hotspot_service.py      # Hotspot detection & seeding
│   │   │   ├── alert_service.py        # Alert generation & resolution
│   │   │   ├── inspection_service.py   # Inspection workflow logic
│   │   │   ├── email_service.py        # SMTP email dispatch
│   │   │   ├── report_service.py       # PDF report generation
│   │   │   ├── shap_service.py         # SHAP explainability
│   │   │   ├── auth_service.py         # Authentication logic
│   │   │   ├── user_service.py         # User operations
│   │   │   ├── weather_service.py      # OpenWeather API integration
│   │   │   ├── export_service.py       # Data export
│   │   │   └── audit_service.py        # Audit log writing
│   │   │
│   │   ├── ml/                  # Machine learning pipeline
│   │   │   ├── model_manager.py        # Singleton model loader
│   │   │   ├── data_preprocessing.py   # Feature preprocessing
│   │   │   ├── feature_engineering.py  # Feature creation
│   │   │   └── risk_scorer.py          # Risk score computation
│   │   │
│   │   ├── core/
│   │   │   ├── config.py        # App settings (pydantic-settings)
│   │   │   └── database.py      # MongoDB connection & Beanie init
│   │   │
│   │   ├── middleware/
│   │   │   ├── cors.py          # CORS configuration
│   │   │   └── error_handler.py # Global exception handlers
│   │   │
│   │   └── schemas/             # Pydantic request/response schemas
│   │
│   ├── scripts/                 # Database seeding & migration tools
│   │   ├── seed_mca_project.py         # Master seed script
│   │   ├── seed_real_hotspots.py       # Hotspot data seeder
│   │   ├── seed_real_model_data.py     # ML model data seeder
│   │   ├── seed_realistic_events.py    # Event data seeder
│   │   ├── seed_regional_forecasts.py  # Regional forecast seeder
│   │   ├── seed_arima_forecasts.py     # ARIMA forecast seeder
│   │   ├── seed_events.py              # Event seeder
│   │   ├── retrain_arima.py            # ARIMA model retraining
│   │   ├── migrate_to_regional.py      # Data migration utility
│   │   ├── deduplicate_hotspots.py     # Hotspot deduplication
│   │   └── update_officer_emails.py    # Officer email updater
│   │
│   ├── seed_users.py            # User seeding script
│   ├── seed_zones.py            # Zone seeding script
│   ├── seed_knowledge.py        # Knowledge base seeder
│   ├── data/models/             # Trained ML model artifacts (.json, .pkl, .csv)
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (not committed)
│   ├── .env.example             # Environment variable template
│   └── logs/app.log             # Application log file
│
└── frontend/
    ├── src/
    │   ├── pages/               # All page-level components (22 pages)
    │   ├── components/          # Shared components (Map, Layout, etc.)
    │   ├── context/             # React context (auth state)
    │   ├── hooks/               # Custom React hooks
    │   ├── services/            # Axios API service modules
    │   └── App.jsx              # Route definitions
    ├── package.json
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **MongoDB Atlas account** — [Sign up free](https://www.mongodb.com/cloud/atlas)

---

### Option A — One-Click Start (Windows)

```
Double-click START.bat in the project root
```

This will automatically:
1. Start the backend server on `http://localhost:8000`
2. Start the frontend dev server on `http://localhost:5173`
3. Open the browser to the login page

---

### Option B — Manual Start

#### 1. Backend Setup

```powershell
cd Main_Project/backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment (see section below)
copy .env.example .env
# Edit .env with your MongoDB URL and other settings

# Start the backend
python -m uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`
Interactive API docs: `http://localhost:8000/docs`

#### 2. Frontend Setup

```powershell
cd Main_Project/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## Environment Configuration

Copy `.env.example` to `.env` and fill in the values:

```env
# Application
APP_NAME=Civic Risk Backend
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development

# Server
HOST=0.0.0.0
PORT=8000

# Database — MongoDB Atlas connection string
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=civic_risk_db

# Security — Change this in production!
SECRET_KEY=your-very-long-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# OpenWeather API (for weather-based risk features)
OPENWEATHER_API_KEY=your-openweather-api-key

# Email (Gmail SMTP — use App Password, not account password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@civicrisk.com

# ML Risk Thresholds
RISK_THRESHOLD_LOW=0.3
RISK_THRESHOLD_MEDIUM=0.6
RISK_THRESHOLD_HIGH=0.8

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

> **Note on MongoDB Atlas:** The free-tier cluster pauses after inactivity. If you see a connection error on startup, log in to [cloud.mongodb.com](https://cloud.mongodb.com), find your cluster, and click **Resume**.

> **Note on Gmail SMTP:** You must use a **Gmail App Password** (not your account password). Enable 2FA on your Google account, then generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

---

## Database Setup & Seeding

After starting the backend for the first time, seed the database with initial data:

```powershell
cd Main_Project/backend

# 1. Seed zones (city regions)
python seed_zones.py

# 2. Seed users (admin + officers)
python seed_users.py

# 3. Seed knowledge base articles
python seed_knowledge.py

# 4. Seed hotspots & ML model data (run from scripts/)
python scripts/seed_real_hotspots.py
python scripts/seed_real_model_data.py
python scripts/seed_realistic_events.py
python scripts/seed_regional_forecasts.py
```

> **Hotspots are also auto-seeded** when the backend starts if the collection is empty.

---

## API Reference

All API endpoints are prefixed with `/api/v1/`. Interactive Swagger docs are available at `http://localhost:8000/docs` when `DEBUG=True`.

| Module | Base Path | Description |
|---|---|---|
| Auth | `/api/v1/auth` | Login, token refresh, password reset |
| Users | `/api/v1/users` | User CRUD, profile management |
| Zones | `/api/v1/zones` | Zone listing and management |
| Alerts | `/api/v1/alerts` | Alert CRUD and status updates |
| Tasks | `/api/v1/tasks` | Task creation, assignment, completion |
| Inspections | `/api/v1/inspections` | Inspection workflow |
| Events | `/api/v1/events` | Strategic event management |
| Predictions | `/api/v1/predictions` | ML risk predictions |
| Analytics | `/api/v1/analytics` | Dashboard statistics |
| Hotspots | `/api/v1/hotspots` | Location-based hotspot data |
| Reports | `/api/v1/reports` | PDF report generation |
| Risk Analysis | `/api/v1/risk-analysis` | Risk scoring and SHAP |
| Forecasts | `/api/v1/analytics/forecasts` | ARIMA time-series forecasts |
| Knowledge Base | `/api/v1/knowledge` | Knowledge articles |
| Audit Logs | `/api/v1/audit` | Action history |
| Models | `/api/v1/models` | ML model info & metrics |
| Config | `/api/v1/config` | System configuration |
| Support | `/api/v1/support` | Support tickets |

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain a token via:
```
POST /api/v1/auth/login
Body: { "email": "...", "password": "..." }
```

---

## ML Models

### XGBoost — Risk Classifier

- **Task:** Multi-class classification of civic complaints into risk levels
- **Classes:** Low (0), Medium (1), High (2), Critical (3)
- **Features:** Complaint category, zone, ward, time of year, weather factors, historical patterns, regional density
- **Artifacts:** `data/models/xgb_civic_risk_model.json`
- **Explainability:** SHAP values computed per prediction for feature attribution

### ARIMA — Complaint Volume Forecaster

- **Task:** Time-series forecasting of daily complaint counts
- **Scope:** Global (city-wide) + per-region (North/South/East/West/Central)
- **Order:** ARIMA(5, 1, 0)
- **Mode:** Fitted in-memory at startup from preprocessed CSV data
- **Forecasts stored in MongoDB:** `forecasts` collection

### Risk Thresholds (configurable)

| Level | Default Score Range |
|---|---|
| Low | 0.0 – 0.30 |
| Medium | 0.30 – 0.60 |
| High | 0.60 – 0.80 |
| Critical | 0.80 – 1.00 |

Thresholds can be adjusted from the **Model Configuration** page in the admin panel.

---

## Frontend Pages

| Page | Route | Access | Description |
|---|---|---|---|
| Login | `/login` | Public | JWT-based login |
| Admin Dashboard | `/dashboard` | Admin | KPI cards, charts, hotspot summary |
| Officer Dashboard | `/officer-dashboard` | Officer | Assigned tasks & alerts |
| User Management | `/users` | Admin | Create/manage officers |
| Zone Management | `/zones` | Admin | City zone configuration |
| Task Management | `/tasks` | Admin/Officer | Task deployment & tracking |
| Inspections | `/inspections` | Admin | Inspection scheduling |
| Admin Inspections | `/admin-inspections` | Admin | Inspection management view |
| Event Management | `/events` | Admin | Strategic event registration |
| Alerts | `/alerts` | Both | Pending & resolved alerts |
| Risk Forecast | `/risk-forecast` | Admin | ARIMA forecast charts by region |
| Recurring Hotspots | `/hotspots` | Admin | Leaflet map + SHAP analysis |
| Analytics | `/analytics` | Admin | Trend charts & category breakdown |
| Reports | `/reports` | Admin | Generate & download PDF reports |
| Audit Logs | `/audit` | Admin | Full action history |
| Knowledge Base | `/knowledge` | Both | Internal articles |
| Model Config | `/model-config` | Admin | ML threshold configuration |
| System Config | `/system-config` | Admin | App-level settings |
| Data Management | `/data` | Admin | Data export & management |
| Helpdesk | `/helpdesk` | Admin | Support ticket management |
| Profile | `/profile` | Both | User profile & password change |

---

## Email Notifications

The system sends automated emails for key workflow events:

| Trigger | Recipient | Content |
|---|---|---|
| Task deployed to officer | Officer | Task name, zone, deadline, priority, description |
| Event deployed (tasks created) | Assigned Officers | Event name, location, task details |
| Task completed by officer | Admin | Completion timestamp, officer name, notes |
| Inspection completed | Admin | Inspection summary, findings, images, timestamp |

Email uses **Gmail SMTP with TLS** (port 587). Configure `SMTP_USER` and `SMTP_PASSWORD` in `.env`.

---

## Default Credentials

After running the seed scripts, the default accounts are created as defined in `backend/seed_users.py`.

| Role | Email |
|---|---|
| Admin | `admin@civic.gov` |
| Officer | `officer@civic.gov` |

> ⚠️ **Passwords are defined in `backend/seed_users.py`.** Do NOT commit real passwords or credentials to this repository. Change all default passwords before any shared or production deployment.

---

## ✅ GitHub Safety Checklist

Before pushing to GitHub, verify the following:

| Check | Status |
|---|---|
| `.env` is listed in `.gitignore` and **NOT** staged | ✔ Covered by root `.gitignore` |
| No hardcoded passwords or API keys in `.py` / `.jsx` files | ✔ Fixed — use `os.getenv()` |
| `node_modules/` is excluded | ✔ Covered |
| `.venv/` is excluded | ✔ Covered |
| ML model `.pkl` / `.joblib` files excluded (too large) | ✔ Covered |
| `logs/` directory excluded | ✔ Covered |
| `.env.example` **IS** committed (with placeholder values only) | ✔ Safe to commit |

> 🔐 **Never commit your real `.env` file.** It contains your MongoDB password, SMTP App Password, and JWT secret key. Only `.env.example` (with placeholder values) should be pushed to GitHub.

---

## Common Issues

| Problem | Solution |
|---|---|
| `connection closed` on backend startup | MongoDB Atlas cluster is paused → go to [cloud.mongodb.com](https://cloud.mongodb.com) and click **Resume** |
| `Attribute "aoo" not found` | Typo in command — use `app.main:app` not `app.main:aoo` |
| Email not sending | Check `SMTP_USER`, `SMTP_PASSWORD` in `.env`; use Gmail App Password, not account password |
| Frontend shows blank page | Ensure backend is running on port 8000; check browser console for CORS errors |
| ML models not loading | Verify `data/models/` directory contains all `.json`, `.pkl`, `.csv` artifacts |

---

## License

This project was developed as an academic MCA final year project.

> **Project Title:** A Spatial-Temporal Analysis and Prediction of Civic Risks Using Machine Learning  
> **System Name:** CIVIC-DSS (Civic Decision Support System)

---

*Built with ❤️ using FastAPI, React, MongoDB, XGBoost, and ARIMA*
