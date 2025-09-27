# United We Rise - Civic Engagement Platform

[![Production Status](https://img.shields.io/badge/Status-Live-green)](https://www.unitedwerise.org)
[![Backend Health](https://img.shields.io/badge/Backend-Operational-green)](https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/health)
[![Documentation](https://img.shields.io/badge/Docs-Complete-blue)](./MASTER_DOCUMENTATION.md)

## 🌟 Revolutionary Social Media for Democracy

United We Rise reimagines social media for civic engagement. Instead of personal relationship-based feeds that create echo chambers, we organize conversations by geographic boundaries and political districts - connecting citizens with their actual representatives and neighbors.

### 🎯 Live Platform
- **Production**: https://www.unitedwerise.org
- **Status**: ✅ Fully operational with 50+ features
- **Users**: Growing organically

### 🏗️ Architecture
- **Frontend**: 🎯 **PROFESSIONAL ES6 MODULAR SYSTEM** (100% inline code elimination achieved) + Azure Static Web Apps
- **Backend**: Node.js + TypeScript + Azure Container Apps
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Azure OpenAI (GPT-3.5, Ada embeddings)
- **Storage**: Azure Blob Storage for media
- **Module System**: 103 ES6 modules with 8-phase dependency chain (historic transformation from 7,413-line monolithic file)
- **Handler Architecture**: 13 specialized event delegation modules replacing inline JavaScript

## 📚 Documentation

### 📖 Complete Reference
**[MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md)** - Comprehensive documentation covering:
- 🎯 **Historic Inline Code Elimination Achievement** (7,413 → 1,080 lines, 85.4% reduction)
- Complete ES6 modular architecture with 103 modules
- Complete API reference (40+ endpoints)
- 13-section professional admin dashboard system with Super-Admin controls
- Database schema and models including hierarchical role system
- UI/UX components and patterns
- Deployment and infrastructure
- Security and authentication with TOTP
- Known issues and troubleshooting
- Development practices
- Session history and lessons learned

**[MODULE-ARCHITECTURE.md](./MODULE-ARCHITECTURE.md)** - ES6 Module System Guide:
- Complete module system documentation
- 13 handler modules with event delegation patterns
- Development patterns and integration guidelines
- Module testing and validation strategies
- Performance optimizations and future enhancements

### ⚡ Quick Reference
**[CLAUDE.md](./CLAUDE.md)** - Critical current state information:
- 🎯 **Mandatory inline code prevention rules** (zero tolerance for architectural regression)
- Production deployment status
- Active issues and their fixes
- Recent deployments and features
- Azure AI integration status
- ES6 module development standards

> **⚠️ IMPORTANT**: All documentation updates should be made in `MASTER_DOCUMENTATION.md`. Do not create separate documentation files.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Azure CLI (for deployment)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# Database setup
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
```

### Frontend Setup
```bash
cd frontend
# 🎯 MODERN ES6 MODULE SYSTEM - no build needed!
# 103 modules load via 8-phase dependency chain
# Zero inline JavaScript - 100% modular architecture
# Open index.html directly or serve with:
python -m http.server 8080

# Module system loads automatically via main.js:
# Phase 1: Core utilities → Phase 2: Configuration
# Phase 3: Integration → Phase 4: Handlers (13 modules)
# Phase 5: Components → Phase 6: Visualization
# Phase 7: Initialization → Phase 8: Services
```

## 🌍 Key Features

### 🗺️ Geography-Based Social Graph
- Your ZIP code determines your primary social graph
- See content from your voting districts
- Connect with actual neighbors and representatives

### 🏛️ Civic Integration
- Direct messaging with verified officials
- Real-time election information
- Representative lookup by location
- Voting records and legislative tracking

### 🤖 AI-Powered Features
- Semantic topic discovery and clustering
- Content moderation and reputation system
- Opposing viewpoint analysis (60% similarity threshold)
- Automated feedback detection and analysis

### 📱 Modern Social Features
- Photo sharing and tagging with privacy controls
- Real-time messaging and notifications
- Follow/friend relationship system
- Infinite scroll feeds with background customization

## 🔐 Security & Privacy

- **Enterprise-grade authentication**: httpOnly cookies with CSRF protection (Facebook/Google-level security)
- **TOTP 2FA**: Optional two-factor authentication with backup codes
- **Hierarchical Role System**: User → Moderator → Admin → Super-Admin with enterprise privilege management
- **OAuth Integration**: Google, Microsoft, Apple social login support
- **XSS Prevention**: httpOnly cookies prevent JavaScript access to auth tokens
- **Azure OpenAI**: Content analysis with no data retention
- **Rate Limiting**: Comprehensive anti-bot protection and request throttling
- **Privileged Access Management**: Super-Admin controls for production system management
- **Reputation System**: Behavior-based scoring (not content censorship)
- **Privacy Controls**: Photo tagging approvals, friend-only messaging, content visibility settings

## 📊 Performance

- **API Response Time**: <200ms average
- **Post Creation**: <100ms (10x improvement via async analysis)
- **Page Load Time**: <3s first contentful paint
- **Uptime**: 99.9% availability target
- **Error Rate**: 3.57% (continuously improving)

## 🏆 Recent Achievements

### 🎯 HISTORIC BREAKTHROUGH (September 27, 2025)
- ✅ **100% Inline Code Elimination Achieved** - First successful completion after "dozens of attempts"
- ✅ **Professional ES6 Modular Architecture** - 103 modules with zero functionality regression
- ✅ **85.4% File Size Reduction** - From 7,413 lines to 1,080 lines of pure HTML
- ✅ **13 Handler Modules Created** - Event delegation replacing inline JavaScript
- ✅ **Industry Standards Compliance** - Modern JavaScript development patterns

### Previous Major Achievements
- ✅ Complete Azure production deployment
- ✅ AI-powered topic discovery and trending
- ✅ Comprehensive photo tagging system
- ✅ Follow/friend relationship system
- ✅ Comprehensive 13-section admin dashboard with advanced monitoring
- ✅ 10x performance improvement in post creation
- ✅ Comprehensive code audit and cleanup

## 🐛 Known Issues

- **Critical**: Login persistence bug (fix deployed, pending verification)
- **Ongoing**: Legislative routes not loading (workaround in place)
- **Minor**: Checkbox display and UI polish items

## 🔮 Roadmap

### Q4 2025
- OAuth integration (Google, Microsoft, Apple)
- SMS verification system
- Mobile app development

### 2026
- Enhanced AI features and fact-checking
- API partnerships with civic data sources
- Global expansion and multi-language support

## 🤝 Contributing

1. Review [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md) for complete technical details
2. Check [CLAUDE.md](./CLAUDE.md) for current issues and status
3. Follow development practices outlined in the master documentation
4. All documentation updates go in `MASTER_DOCUMENTATION.md` only

## 📄 License

[License information to be added]

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/unitedwerise/unitedwerise/issues)
- **Security**: security@unitedwerise.org (planned)
- **General**: support@unitedwerise.org (planned)

---

**Built with ❤️ for democracy**

*Connecting citizens with their representatives, one ZIP code at a time.*