# Green Epidemic - Netlify Deployment Guide

## Current Status: ✅ Ready for Production Deployment

### ✅ All Critical Issues Fixed

1. **ESLint Configuration**: Created `.eslintrc.json` with proper Next.js rules
2. **Environment Variables**: Created `.env.example` template with all required variables
3. **Type Safety**: Fixed interface mismatches between components
4. **Code Quality**: Fixed unescaped HTML entities and Link imports
5. **Build Configuration**: Verified `next.config.js` and `package.json` compatibility
6. **TypeScript Build Errors**: Fixed all conditional rendering issues in MapComponent
7. **Vercel Cron Jobs**: Updated to daily schedule for hobby account compatibility

### ⚠️ Non-Critical Warnings (Safe to deploy)

1. **ESLint Warnings**: Multiple dependency warnings in useEffect hooks
   - **Impact**: Build warnings only, application functions normally
   - **Status**: Warnings don't block deployment
   - **Note**: These are optimization suggestions, not errors

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

#### Netlify Configuration:
- Framework: Next.js 15  
- Build Command: `npm run build`
- Publish Directory: `.next`
- Node.js Version: 18.x or 20.x
- Environment Variables: Set in Netlify dashboard

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

1. **OAuth Configuration**: Update Google & LINE OAuth settings
   - Google Console: Add `https://green-epidemic.netlify.app` to authorized origins
   - Add `https://green-epidemic.netlify.app/api/auth/callback/google` to redirect URIs
   - LINE Console: Update callback URL to `https://green-epidemic.netlify.app/api/auth/callback/line`

2. **Database Migration**: Run Prisma migrations on production
3. **API Keys**: Verify all external API integrations  
4. **Environment Variables**: Set all required variables in Netlify dashboard
5. **Testing**: Verify authentication and all features work

### 🔧 OAuth Setup Instructions

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to Authorized JavaScript origins: `https://green-epidemic.netlify.app`
5. Add to Authorized redirect URIs: `https://green-epidemic.netlify.app/api/auth/callback/google`

**LINE Login:**
1. Go to [LINE Developers Console](https://developers.line.biz)
2. Select your channel
3. Update Callback URL: `https://green-epidemic.netlify.app/api/auth/callback/line`

### 🐛 Monitoring and Maintenance

- Monitor Vercel deployment logs
- Check database connection health
- Verify external API rate limits
- Monitor application performance

---

**Status**: ✅ Ready for production deployment  
**Build**: ✅ Builds successfully with warnings only  
**Functionality**: ✅ All core features working including PM2.5 layer  
**Deployment Risk**: 🟢 Very Low