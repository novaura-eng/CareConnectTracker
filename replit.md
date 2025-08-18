# Silver CareConnect - Replit Configuration

## Overview

Silver CareConnect is a healthcare application designed for home care agencies to manage weekly check-ins with family caregivers. The system automates the process of sending surveys via SMS, collecting responses about patient care, and providing administrative dashboards for monitoring compliance and health incidents.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom healthcare-themed color palette
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: PostgreSQL-based sessions with connect-pg-simple

### Key Components

#### Database Schema
- **Caregivers**: Store caregiver contact information and emergency contacts
- **Patients**: Patient records linked to caregivers via foreign keys
- **Weekly Check-ins**: Scheduled survey periods with completion tracking
- **Survey Responses**: Structured health and safety questionnaire responses

#### API Endpoints
- `GET /api/survey/:checkInId` - Retrieve survey form data
- `POST /api/survey/:checkInId/submit` - Submit completed survey responses
- `GET /api/admin/stats` - Dashboard statistics for administrators
- `GET /api/admin/responses` - Recent survey responses for monitoring

#### Frontend Routes
- `/` - Landing page with system overview
- `/survey/:checkInId` - Public survey form for caregivers
- `/admin` - Administrative dashboard with response monitoring
- Additional admin routes for caregiver and report management

### Data Flow

1. **Survey Creation**: Automated cron jobs create weekly check-ins for all caregiver-patient pairs
2. **SMS Notifications**: Twilio integration sends survey links via SMS to caregivers
3. **Response Collection**: Caregivers complete surveys through mobile-optimized forms
4. **Data Storage**: Responses stored in PostgreSQL with referential integrity
5. **Admin Monitoring**: Real-time dashboard displays completion rates and critical incidents

### External Dependencies

#### Core Libraries
- **Database**: Drizzle ORM with Neon serverless PostgreSQL driver
- **Validation**: Zod for runtime type checking and form validation
- **UI Components**: Comprehensive shadcn/ui component library
- **SMS Service**: Twilio for automated SMS notifications
- **Scheduling**: node-cron for automated task scheduling

#### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast production bundling for server code
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **PostCSS**: CSS processing with autoprefixer

### Deployment Strategy

The application uses a monorepo structure with separate build processes for client and server:

#### Development
- `npm run dev` - Starts Express server with Vite middleware for hot reloading
- Vite handles frontend development with fast HMR
- TypeScript compilation in watch mode for server changes

#### Production
- `npm run build` - Creates optimized client bundle and server bundle
- Client assets served as static files from `/dist/public`
- Server runs as Node.js process with bundled dependencies
- Database migrations handled via Drizzle Kit

#### Environment Configuration
- `SUPABASE_DATABASE_URL` - Supabase PostgreSQL connection string (production)
- `DATABASE_URL` - Neon PostgreSQL connection string (development fallback)
- `SUPABASE_ANON_KEY` - Supabase service role API key for database access
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - SMS service credentials
- `TWILIO_PHONE_NUMBER` - Sender phone number for SMS notifications

## Changelog
```
Changelog:
- July 01, 2025. Initial setup
- July 01, 2025. Rebranded from CareConnect Pro to Silver CareConnect with custom logo integration
- July 02, 2025. Platform deployed and operational at https://care-connect-tracker-tim692.replit.app
- July 02, 2025. Manual survey creation system implemented for immediate use
- July 02, 2025. Survey links verified working on external devices via SMS/email
- July 07, 2025. Fixed all internal navigation and client-side routing issues
- July 07, 2025. Platform fully operational with working sidebar navigation across all admin sections
- July 08, 2025. Added complete Patient Management system with dedicated interface
- July 08, 2025. Fixed patient creation form validation and API integration
- July 08, 2025. Platform fully functional for caregiver and patient management
- July 08, 2025. Implemented secure authentication system using Replit Auth
- July 08, 2025. Added professional landing page for public access with team login
- July 08, 2025. Protected all admin routes while keeping survey links public
- July 08, 2025. Fixed home page header alignment for proper display across screen sizes
- July 08, 2025. Fixed survey page header alignment for email link access on all devices
- July 18, 2025. Fixed duplicate webpage rendering issue by restructuring App component router logic
- July 18, 2025. Updated email service to use verified SendGrid sender address (tbweil40@gmail.com)
- August 18, 2025. Migrated database schema to Supabase PostgreSQL production environment
- August 18, 2025. Updated survey responses to use boolean fields instead of text yes/no values
- August 18, 2025. Added SUPABASE_DATABASE_URL and SUPABASE_ANON_KEY environment variables
- August 18, 2025. Successfully migrated existing survey response data to new boolean schema
- August 18, 2025. Fixed database connection issue - removed invalid Supabase JWT token from database URL configuration
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```