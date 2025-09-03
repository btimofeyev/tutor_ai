# Klio AI Tutoring Platform

## Overview
AI-powered educational platform for children with advanced parental controls, content filtering, and comprehensive learning management features.

## Project Structure
```
/root/klioai/
├── backend/                    # Node.js backend API server
│   ├── src/
│   │   ├── server.js          # Main server entry point
│   │   ├── controllers/       # API controllers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Authentication & validation middleware
│   │   ├── services/         # Business logic services
│   │   └── utils/           # Utilities & helpers
│   ├── migrations/           # Database migrations
│   ├── scripts/             # Maintenance & utility scripts
│   └── .env                # Environment configuration
├── klioai-frontend/          # Student-facing Next.js frontend
├── parent-dashboard-frontend/ # Parent dashboard Next.js frontend
└── CLAUDE.md               # This file
```

## Technology Stack
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT, Supabase Auth
- **AI**: OpenAI API (GPT models)
- **Payment**: Stripe
- **Frontend**: Next.js, React, Tailwind CSS
- **Process Management**: PM2

## Environment Configuration

### Backend Environment Variables (.env in backend/)
```bash
# Application
NODE_ENV=production
PORT=3002

# Database - Supabase
SUPABASE_URL=https://yklwdolmzgtivzdixofs.supabase.co
SUPABASE_ANON_KEY=eyJh... # (configured)
SUPABASE_SERVICE_ROLE_KEY=eyJh... # (configured)

# Authentication
JWT_SECRET=# (configured - 88 character secret)

# AI Services
OPENAI_API_KEY=sk-proj-... # (configured)

# Payment Processing
STRIPE_SECRET_KEY=sk_test_... # (test key configured)
STRIPE_WEBHOOK_SECRET=whsec_... # (test webhook configured)

# Optional Features
MCP_ENABLED=false
LOG_LEVEL=info
FRONTEND_URL=https://klioai.com
```

### Frontend Environment Variables 

#### Parent Dashboard (.env.local in parent-dashboard-frontend/)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://yklwdolmzgtivzdixofs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh... # (configured)
NEXT_PUBLIC_API_URL=https://klioai.com/api
NEXT_PUBLIC_TUTOR_URL=https://tutor.klioai.com
```

#### Klio Tutor Frontend (.env.local in klio-tutor-frontend/)
```bash
NEXT_PUBLIC_API_URL=https://klioai.com/api
PORT=3003
```

## Development Commands

### Backend
```bash
cd /root/klioai/backend
npm install                    # Install dependencies
npm start                     # Start development server
pm2 start src/server.js --name klioai  # Start with PM2
pm2 logs klioai               # View logs
pm2 restart klioai            # Restart service
```

### Frontend Applications
```bash
# Klio Tutor Frontend (Student Interface)
cd /root/klioai/klio-tutor-frontend
npm install
npm run dev                   # Development (port 3003)
npm run build                 # Production build

# Parent Dashboard
cd /root/klioai/parent-dashboard-frontend
npm install
npm run dev                   # Development
npm run build                 # Production build
```

## Production Deployment

### PM2 Process Management

#### Backend API Service
- Service name: `klioai`
- Port: 3002
- Process status: `pm2 status`
- Logs: `pm2 logs klioai`
- Restart: `pm2 restart klioai`

#### Parent Dashboard Frontend
- Service name: `klioai-frontend`
- Port: 3000
- Location: `/root/klioai/parent-dashboard-frontend`
- Start command: `cd /root/klioai/parent-dashboard-frontend && pm2 start npm --name "klioai-frontend" -- start`
- Logs: `pm2 logs klioai-frontend`
- Restart: `pm2 restart klioai-frontend`
- Environment file: `.env.local` (contains Supabase public keys and API URL)

#### Klio Tutor Frontend (Student Interface)
- Service name: `klio-tutor`
- Port: 3003
- Location: `/root/klioai/klio-tutor-frontend`
- Start command: `cd /root/klioai/klio-tutor-frontend && pm2 start npm --name "klio-tutor" -- start`
- Logs: `pm2 logs klio-tutor`
- Restart: `pm2 restart klio-tutor`
- Environment file: `.env.local` (contains API URL)

### Domain Configuration
- **Production URLs**: 
  - Parent Dashboard: https://klioai.com (port 3000)
  - Student Tutor: https://tutor.klioai.com (port 3003)
  - Backend API: https://klioai.com/api (port 3002)
- **Nginx Configuration**:
  - `klioai.com` → proxies to parent dashboard frontend on port 3000
  - `klioai.com/api/` → proxies to backend API on port 3002
  - `tutor.klioai.com` → proxies to klio tutor frontend on port 3003
- **SSL**: Managed via Let's Encrypt certificates for both domains
- **Nginx config locations**: 
  - `/etc/nginx/sites-available/klioai.com`
  - `/etc/nginx/sites-available/tutor.klioai.com`

## Database Management

### Supabase Setup
1. Database tables are managed through Supabase dashboard
2. Migrations located in `backend/migrations/`
3. Run migrations: `node backend/scripts/run-migration.js`

### Key Tables
- `users` - Parent accounts
- `children` - Child profiles
- `chat_sessions` - AI conversation history
- `materials` - Learning materials
- `subjects` - Subject management
- `schedules` - Learning schedules

## Security Features

### Authentication
- JWT-based authentication
- Supabase Row Level Security (RLS)
- Child-specific authentication
- Session management

### Content Filtering
- AI-powered content filtering
- Parental controls
- Chat monitoring
- Activity logging

### API Security
- Environment variable validation
- CORS configuration (allows klioai.com and tutor.klioai.com)
- Rate limiting
- Input validation

## Key Features

### Student Interface
- AI-powered tutoring chat
- Subject-specific learning
- Progress tracking
- Voice input/output
- Workspace tools

### Parent Dashboard
- Child account management
- Learning progress monitoring
- Chat insights and summaries
- Schedule management
- Grade tracking
- Material upload and management

### AI Capabilities
- OpenAI GPT integration
- Context-aware conversations
- Learning memory service
- Progress analytics
- Content summarization

## Maintenance Tasks

### Daily
- Check PM2 process status: `pm2 status`
- Review logs: `pm2 logs klioai`
- Monitor error rates

### Weekly
- Run cleanup scripts: `node backend/scripts/daily-maintenance.js`
- Check database performance
- Review chat insights

### Monthly
- Update dependencies: `npm audit fix`
- Review security logs
- Backup database (via Supabase)

## Troubleshooting

### Common Issues
1. **Application won't start**: Check environment variables in `.env`
2. **502 errors**: Verify PM2 process is running: `pm2 status`
3. **Database errors**: Check Supabase connection and RLS policies
4. **API key errors**: Verify OpenAI and Stripe keys are valid

### Logs
- Application logs: `pm2 logs klioai`
- Error logs: `pm2 logs klioai --err`
- System logs: Check Supabase dashboard

### Health Check
- Backend health: `curl http://localhost:3002/api/health`
- PM2 status: `pm2 status`
- Domain status: `curl -I https://klioai.com`

## Important Notes
- **Security**: Never commit real API keys to git
- **Backups**: Database backed up automatically via Supabase
- **Monitoring**: Set up alerts for application downtime
- **Updates**: Test in development environment before production deployment
- **PM2 Save**: After making changes to PM2 processes, run `pm2 save` to persist configuration
- **Frontend Build**: Always run `npm run build` in parent-dashboard-frontend before starting with PM2
- **Port Usage**: 
  - Port 3000: Parent Dashboard Frontend (klioai.com)
  - Port 3003: Klio Tutor Frontend (tutor.klioai.com)
  - Port 3002: Backend API (klioai.com/api)
- **Note**: Port 3001 is used by famlynook service
- **Architecture**: Separate subdomains for parent and student interfaces
- **SSL Certificates**: Both klioai.com and tutor.klioai.com have Let's Encrypt SSL