# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.9+ installed
- ✅ MongoDB running (default: localhost:27017)
- ✅ Virtual environment activated

## Quick Start (3 Steps)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Server
```bash
uvicorn app.main:app --reload
```

### 3. Access the API
- API Documentation: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

## First Steps

### Create an Admin User
Use the API docs (http://localhost:8000/docs) to:

1. Go to `/api/v1/auth/register`
2. Click "Try it out"
3. Use this JSON:
```json
{
  "email": "admin@example.com",
  "username": "admin",
  "password": "admin123",
  "full_name": "Admin User",
  "role": "admin"
}
```
4. Click "Execute"

### Login
1. Go to `/api/v1/auth/login`
2. Use your credentials:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```
3. Copy the `access_token` from the response

### Authorize
1. Click the "Authorize" button at the top of the docs
2. Enter: `Bearer YOUR_ACCESS_TOKEN`
3. Click "Authorize"

Now you can test all endpoints!

## Common Issues

### MongoDB Connection Error
- Make sure MongoDB is running: `mongod`
- Check connection string in `.env`

### Import Errors
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

### Port Already in Use
- Change port in `.env` or use: `uvicorn app.main:app --port 8001`

## Next Steps

1. Create some test complaints via `/api/v1/complaints/`
2. Generate predictions via `/api/v1/predictions/`
3. View analytics at `/api/v1/analytics/dashboard`
4. Detect hotspots at `/api/v1/hotspots/detect`

## Development Tips

- Use `--reload` flag for auto-restart on code changes
- Check logs in `logs/app.log`
- MongoDB data is in the `civic_risk_db` database
- API is CORS-enabled for frontend development

Enjoy building with Civic Risk Backend! 🚀
