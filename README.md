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
- **Frontend**: Vanilla JavaScript + Azure Static Web Apps
- **Backend**: Node.js + TypeScript + Azure Container Apps  
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Azure OpenAI (GPT-3.5, Ada embeddings)
- **Storage**: Azure Blob Storage for media

## 📚 Documentation

### 📖 Complete Reference
**[MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md)** - Comprehensive documentation covering:
- Complete API reference (40+ endpoints)
- Database schema and models
- UI/UX components and patterns
- Deployment and infrastructure
- Security and authentication
- Known issues and troubleshooting
- Development practices
- Session history and lessons learned

### ⚡ Quick Reference  
**[CLAUDE.md](./CLAUDE.md)** - Critical current state information:
- Production deployment status
- Active issues and their fixes
- Recent deployments and features
- Azure AI integration status

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
# No build needed - vanilla JavaScript
# Open index.html directly or serve with:
python -m http.server 8080
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

- JWT authentication with 30-day tokens
- Azure OpenAI for content analysis (no data retention)
- Comprehensive rate limiting and anti-bot protection
- Behavior-based reputation system (not content censorship)
- Privacy-controlled photo tagging and friend-only messaging

## 📊 Performance

- **API Response Time**: <200ms average
- **Post Creation**: <100ms (10x improvement via async analysis)
- **Page Load Time**: <3s first contentful paint
- **Uptime**: 99.9% availability target
- **Error Rate**: 3.57% (continuously improving)

## 🏆 Recent Achievements

- ✅ Complete Azure production deployment
- ✅ AI-powered topic discovery and trending
- ✅ Comprehensive photo tagging system
- ✅ Follow/friend relationship system
- ✅ Real-time admin dashboard with monitoring
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