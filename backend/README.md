# Civic Risk Management Backend

A comprehensive FastAPI-based backend system for civic risk management with ML-powered predictions, hotspot detection, and analytics.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Admin, Officer, Viewer)
- **Complaint Management**: Full CRUD operations for civic complaints with geolocation support
- **ML Predictions**: Risk scoring using XGBoost and other ML models
- **Hotspot Detection**: Geographic clustering using DBSCAN to identify problem areas
- **Analytics Dashboard**: Real-time statistics, trends, and insights
- **Alert System**: Automated notifications for high-risk situations
- **Report Generation**: Comprehensive analytics reports with customizable parameters
- **Weather Integration**: OpenWeather API integration for environmental data

## Technology Stack

- **Framework**: FastAPI
- **Database**: MongoDB with Beanie ODM
- **Authentication**: JWT (python-jose) + bcrypt
- **ML Libraries**: scikit-learn, XGBoost, pandas, numpy
- **Geospatial**: geopy for distance calculations
- **Email**: aiosmtplib for async email notifications

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   ├── core/            # Configuration & database
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── ml/              # ML models & utilities
│   ├── utils/           # Helper functions
│   ├── middleware/      # Custom middleware
│   └── main.py          # Application entry point
├── data/                # Data storage
├── logs/                # Application logs
├── tests/               # Test files
└── requirements.txt     # Dependencies
```

## Installation

### Prerequisites

- Python 3.9+
- MongoDB 4.4+
- pip

### Setup

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `SECRET_KEY`: Generate a secure random key
   - `MONGODB_URL`: Your MongoDB connection string
   - `OPENWEATHER_API_KEY`: Your OpenWeather API key (optional)
   - `SMTP_*`: Email configuration for alerts

5. **Create required directories**
   ```bash
   mkdir -p data/raw data/processed data/models logs
   ```

## Running the Application

### Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/me` - Get current user info
- `PUT /api/v1/auth/me` - Update user profile
- `POST /api/v1/auth/change-password` - Change password

### Complaints
- `POST /api/v1/complaints/` - Create complaint
- `GET /api/v1/complaints/` - List complaints (with filters)
- `GET /api/v1/complaints/{id}` - Get complaint details
- `PUT /api/v1/complaints/{id}` - Update complaint
- `DELETE /api/v1/complaints/{id}` - Delete complaint
- `POST /api/v1/complaints/{id}/upvote` - Upvote complaint

### Predictions
- `POST /api/v1/predictions/` - Generate risk prediction
- `GET /api/v1/predictions/{id}` - Get prediction details
- `GET /api/v1/predictions/zone/{zone}` - Get predictions for zone
- `GET /api/v1/predictions/high-risk/recent` - Get high-risk predictions

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/categories` - Category breakdown
- `GET /api/v1/analytics/zones` - Zone breakdown
- `GET /api/v1/analytics/trends` - Complaint trends

### Hotspots
- `GET /api/v1/hotspots/detect` - Detect geographic hotspots
- `GET /api/v1/hotspots/zones` - Get zones with hotspots

### Alerts
- `GET /api/v1/alerts/` - List active alerts
- `GET /api/v1/alerts/my-alerts` - Get user's alerts
- `POST /api/v1/alerts/{id}/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/{id}/resolve` - Resolve alert

### Reports
- `POST /api/v1/reports/generate` - Generate report
- `GET /api/v1/reports/{id}` - Get report details
- `GET /api/v1/reports/` - List reports

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Application name | Civic Risk Backend |
| `DEBUG` | Debug mode | True |
| `SECRET_KEY` | JWT secret key | *Required* |
| `MONGODB_URL` | MongoDB connection URL | mongodb://localhost:27017 |
| `DATABASE_NAME` | Database name | civic_risk_db |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |
| `OPENWEATHER_API_KEY` | OpenWeather API key | Optional |

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Style

```bash
# Format code
black app/

# Lint code
flake8 app/
```

## ML Models

The system includes several ML components:

1. **XGBoost Model**: Risk prediction based on complaint features
2. **DBSCAN Clustering**: Geographic hotspot detection
3. **ARIMA (stub)**: Time series forecasting
4. **Random Forest (stub)**: Alternative classification model

Models are stored in `data/models/` and can be retrained with new data.

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- CORS protection
- Input validation with Pydantic
- SQL injection prevention (NoSQL)

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
