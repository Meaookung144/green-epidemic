# Green Epidemic - Environmental & Health Monitoring System

A comprehensive web application built with Next.js for monitoring environmental conditions (weather, PM2.5) and health-related reports (COVID-19, flu) in real-time.

## Features

### 🗺️ Interactive Map
- Full-screen map with multiple layers
- Weather data visualization
- PM2.5 air quality monitoring
- COVID-19 and flu report tracking
- Toggle layers on/off

### 🔔 Smart Notifications
- LINE messaging integration
- Location-based alerts (500m radius)
- Customizable notification preferences
- Real-time alerts for nearby health reports

### 📊 Data Collection
- Automatic weather/PM2.5 data fetching every hour
- Multiple API integrations (OpenWeatherMap, AQICN)
- Intelligent data freshness checking
- Automatic cleanup of old data

### 👥 User Management
- Google OAuth integration
- LINE login support
- Home location management
- Multiple surveillance points per user

### 🛡️ Admin Panel
- Report approval system
- User management
- Data analytics
- System monitoring

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Neon PostgreSQL
- **Maps**: Leaflet, React-Leaflet
- **Authentication**: NextAuth.js
- **Styling**: shadcn/ui, Tailwind CSS

## Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/green-epidemic.git
   cd green-epidemic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your API keys:
   
   ```bash
   cp .env.example .env
   ```

   Required API keys:
   - **DATABASE_URL**: Neon PostgreSQL connection string
   - **OPENWEATHER_API_KEY**: From [OpenWeatherMap](https://openweathermap.org/api)
   - **AQICN_API_KEY**: From [World Air Quality Index](https://aqicn.org/api/)
   - **GOOGLE_CLIENT_ID/SECRET**: From [Google Console](https://console.cloud.google.com/)
   - **LINE_CHANNEL_ID/SECRET**: From [LINE Developers](https://developers.line.biz/)
   - **CRON_SECRET**: Random secure string for cron job authentication

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Weather Data
- `GET /api/weather?lat={lat}&lon={lon}` - Fetch weather data for coordinates
- `POST /api/weather` - Batch fetch weather data for multiple locations

### Reports
- `GET /api/reports?status=APPROVED` - Fetch approved health reports
- `POST /api/reports` - Submit new health report

### Cron Jobs
- `GET /api/cron/weather` - Automated weather data collection (runs hourly)

## Database Schema

### Key Models
- **User**: User profiles with OAuth integration
- **SurveillancePoint**: User-defined monitoring locations
- **Report**: Health incident reports (COVID-19, flu, etc.)
- **WeatherData**: Environmental data (temperature, PM2.5, AQI)
- **Notification**: Alert system for nearby incidents

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Enable Vercel Cron for automated data collection
4. Deploy

### Custom Deployment
1. Build the application: `npm run build`
2. Set up cron job to call `/api/cron/weather` hourly
3. Configure reverse proxy (nginx recommended)
4. Set up SSL certificate

## Usage

### For Users
1. **Sign up** using Google or LINE account
2. **Set home location** in profile settings
3. **Add surveillance points** for areas you want to monitor
4. **Configure notifications** for different alert types
5. **Submit reports** when you notice health incidents

### For Admins
1. Access admin panel at `/admin`
2. Review and approve/reject submitted reports
3. Monitor system health and data quality
4. Manage user accounts and permissions

## LINE Integration

### Setting up LINE Bot
1. Create a LINE channel at [LINE Developers](https://developers.line.biz/)
2. Enable LINE Login and Messaging API
3. Configure webhook URL: `https://yourdomain.com/api/line/webhook`
4. Set up rich menu for easy report submission

### Rich Menu Features
- Quick report submission
- Location sharing
- Alert preferences
- System status

## Data Sources

### Weather Data
- **OpenWeatherMap**: Temperature, humidity, wind data
- **AQICN**: PM2.5, PM10, AQI data
- **Update Frequency**: Every hour
- **Coverage**: Global

### Health Data
- **User Reports**: Community-submitted health incidents
- **Admin Verification**: All reports require approval
- **Location-based**: GPS coordinates with address lookup

## Development

### Adding New Features
1. Update database schema in `prisma/schema.prisma`
2. Run `npx prisma db push` to apply changes
3. Create API endpoints in `app/api/`
4. Add frontend components in `components/`
5. Update map layers if needed

### Testing
```bash
# Run linting
npm run lint

# Test weather data fetching
curl "http://localhost:3000/api/weather?lat=13.7563&lon=100.5018"

# Test cron job (requires CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/weather"
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Create an issue on GitHub
- Contact: [your-email@domain.com]

---

**Note**: This system is designed for monitoring purposes only. Always consult healthcare professionals for medical advice.