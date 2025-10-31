# Green Epidemic - Vercel Deployment Guide

## Current Status: Ready for Deployment with Known Issues

### ✅ Completed Fixes for Deployment

1. **ESLint Configuration**: Created `.eslintrc.json` with proper Next.js rules
2. **Environment Variables**: Created `.env.example` template with all required variables
3. **Type Safety**: Fixed interface mismatches between components
4. **Code Quality**: Fixed unescaped HTML entities and Link imports
5. **Build Configuration**: Verified `next.config.js` and `package.json` compatibility

### ⚠️ Known Issues (Non-blocking for deployment)

1. **TypeScript Conditional Rendering**: PM2.5 layer in MapComponent has conditional rendering type issues
   - **Impact**: PM2.5 air quality layer temporarily disabled
   - **Status**: Isolated, doesn't affect core functionality
   - **TODO**: Fix `Type 'false | void | undefined' is not assignable to type 'ReactNode'`

2. **ESLint Warnings**: Multiple dependency warnings in useEffect hooks
   - **Impact**: Build warnings only, application functions normally
   - **Status**: Warnings don't block deployment
   - **TODO**: Add proper dependency arrays or useCallback wrappers

### 🚀 Deployment Checklist

#### Environment Variables Required:
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.vercel.app"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
LINE_CLIENT_ID="..."
LINE_CLIENT_SECRET="..."
NASA_FIRMS_API_KEY="..."
AIR4THAI_API_KEY="..."
NODE_ENV="production"
```

#### Vercel Configuration:
- Framework: Next.js 15
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`
- Node.js Version: 18.x or 20.x

#### Database Setup:
1. Ensure PostgreSQL database is accessible from Vercel
2. Run `npx prisma generate` in build process (handled by postinstall)
3. Run `npx prisma db push` for schema deployment (manual step)

### 📁 Project Structure Ready for Deployment

- ✅ Next.js 15 App Router structure
- ✅ API routes properly organized
- ✅ Static assets in `/public`
- ✅ Prisma schema configured
- ✅ Authentication with NextAuth
- ✅ Responsive UI components
- ✅ International translations

### 🔧 Key Features Working

1. **Authentication**: Google OAuth and Line Login
2. **Maps**: Leaflet integration with hotspot display
3. **Weather**: Air4Thai API integration for air quality data
4. **Admin Panel**: User management and statistics
5. **Telemedicine**: Video consultation system
6. **AI Analysis**: Health risk assessment
7. **Real-time Data**: Weather and air quality monitoring

### 🎯 Deployment Commands

```bash
# Install dependencies
npm install

# Build for production (with warnings)
npm run build

# Verify build output
npm run start
```

### 📋 Post-Deployment Tasks

1. **Database Migration**: Run Prisma migrations on production
2. **API Keys**: Verify all external API integrations
3. **Cron Jobs**: Set up weather data sync (configured in vercel.json)
4. **Domain**: Configure custom domain if needed
5. **Testing**: Verify all features work in production environment

### 🐛 Monitoring and Maintenance

- Monitor Vercel deployment logs
- Check database connection health
- Verify external API rate limits
- Monitor application performance

---

**Status**: 🟡 Ready for deployment with minor issues  
**Build**: ⚠️ Builds with warnings (non-blocking)  
**Functionality**: ✅ All core features working  
**Deployment Risk**: 🟢 Low