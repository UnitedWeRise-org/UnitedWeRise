# United We Rise - Production Deployment Guide

This guide covers the complete production deployment of the United We Rise platform, including infrastructure setup, security configuration, and monitoring.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [SSL/TLS Setup](#ssltls-setup)
4. [Database Setup](#database-setup)
5. [Deployment](#deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring](#monitoring)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Server**: Minimum 4 CPU cores, 8GB RAM, 100GB SSD
- **OS**: Ubuntu 20.04 LTS or later (recommended)
- **Docker**: Version 24.0 or later
- **Docker Compose**: Version 2.20 or later
- **Domain**: Registered domain with DNS control

### Required Services

- **Email Provider**: SMTP server or service (Gmail, SendGrid, AWS SES)
- **SMS Provider**: Twilio account for phone verification
- **API Keys**: Google Civic Information API, Geocodio, hCaptcha
- **Cloud Storage**: AWS S3 for backups (optional but recommended)
- **SSL Certificate**: Let's Encrypt or commercial certificate

## Environment Configuration

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-org/unitedwerise.git
cd unitedwerise

# Copy environment configuration
cp .env.production.example .env.production

# Edit the configuration file
nano .env.production
```

### 2. Required Environment Variables

#### Database Configuration
```bash
DATABASE_NAME=unitedwerise_prod
DATABASE_USER=unitedwerise_user
DATABASE_PASSWORD=your_secure_database_password_here
```

#### Application Security
```bash
JWT_SECRET=your_super_secure_jwt_secret_key_at_least_64_characters_long
JWT_REFRESH_SECRET=your_super_secure_jwt_refresh_secret_different_from_above
BCRYPT_SALT_ROUNDS=14
```

#### URLs and CORS
```bash
FRONTEND_URL=https://unitedwerise.com
BACKEND_URL=https://api.unitedwerise.com
ALLOWED_ORIGINS=https://unitedwerise.com,https://www.unitedwerise.com
```

#### Email Configuration (Choose one)

**Option 1: SMTP (Gmail)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@unitedwerise.com
SMTP_PASS=your_app_password_here
```

**Option 2: SendGrid**
```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

**Option 3: AWS SES**
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@unitedwerise.com
```

#### API Keys
```bash
GOOGLE_CIVIC_API_KEY=your_google_civic_information_api_key
GEOCODIO_API_KEY=your_geocodio_api_key
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d unitedwerise.com -d www.unitedwerise.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/unitedwerise.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/unitedwerise.com/privkey.pem nginx/ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart nginx
```

### Option 2: Commercial Certificate

```bash
# Place your certificate files in nginx/ssl/
mkdir -p nginx/ssl
cp your-certificate.pem nginx/ssl/fullchain.pem
cp your-private-key.pem nginx/ssl/privkey.pem
```

## Database Setup

### 1. Create Database User

```bash
# Start PostgreSQL temporarily
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for startup
sleep 10

# Create database and user
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "
CREATE DATABASE unitedwerise_prod;
CREATE USER unitedwerise_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE unitedwerise_prod TO unitedwerise_user;
GRANT ALL ON SCHEMA public TO unitedwerise_user;
ALTER USER unitedwerise_user CREATEDB;
"
```

### 2. Initialize Database Schema

```bash
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend npx prisma generate
```

## Deployment

### 1. Initial Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh deploy
```

### 2. Verify Deployment

```bash
# Check service status
./scripts/deploy.sh status

# Check health endpoints
curl -f https://unitedwerise.com/health
curl -f https://unitedwerise.com/api/health

# View logs
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend
```

## Post-Deployment

### 1. Create Admin User

```bash
# Connect to backend container
docker-compose -f docker-compose.prod.yml exec backend sh

# Run admin creation script (you'll need to create this)
node scripts/create-admin.js --email admin@unitedwerise.com --username admin
```

### 2. Test Critical Features

- [ ] User registration with email verification
- [ ] Phone verification (if enabled)
- [ ] Login/logout functionality
- [ ] Post creation and moderation
- [ ] Reporting system
- [ ] Admin dashboard access
- [ ] Email notifications

### 3. Configure DNS

```bash
# A Records
unitedwerise.com → YOUR_SERVER_IP
www.unitedwerise.com → YOUR_SERVER_IP
api.unitedwerise.com → YOUR_SERVER_IP
admin.unitedwerise.com → YOUR_SERVER_IP

# CNAME (alternative)
www.unitedwerise.com → unitedwerise.com
```

## Monitoring

### 1. Access Monitoring Tools

- **Grafana**: http://your-server:3100
  - Username: admin
  - Password: (from GRAFANA_ADMIN_PASSWORD)

- **Prometheus**: http://your-server:9090

### 2. Set Up Alerts

Create alerting rules in `monitoring/rules/alerts.yml`:

```yaml
groups:
  - name: unitedwerise_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
```

### 3. External Monitoring

Consider setting up external monitoring services:
- **Uptime**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **Performance**: New Relic, DataDog

## Maintenance

### 1. Regular Backups

```bash
# Manual backup
./scripts/deploy.sh backup

# Verify backup
ls -la backup/

# Test restore (CAUTION: This will replace current data)
docker-compose -f docker-compose.prod.yml exec backup /usr/local/bin/restore.sh unitedwerise_20240101_120000.sql.gz
```

### 2. Updates

```bash
# Pull latest code
git pull origin main

# Deploy updates
./scripts/deploy.sh deploy

# Rollback if needed
./scripts/deploy.sh rollback
```

### 3. Log Management

```bash
# View logs
./scripts/deploy.sh logs backend
./scripts/deploy.sh logs frontend
./scripts/deploy.sh logs nginx

# Clear old logs (weekly)
docker system prune -f
find logs/ -name "*.log" -mtime +30 -delete
```

### 4. Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
./scripts/deploy.sh deploy
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from backend
docker-compose -f docker-compose.prod.yml exec backend sh
# psql $DATABASE_URL
```

#### 2. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -I https://unitedwerise.com
```

#### 3. Email Delivery Issues
```bash
# Check SMTP configuration
docker-compose -f docker-compose.prod.yml exec backend node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify((error, success) => {
  if (error) console.log('SMTP Error:', error);
  else console.log('SMTP OK');
});
"
```

#### 4. High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services if needed
./scripts/deploy.sh restart backend
./scripts/deploy.sh restart frontend
```

### Log Locations

- **Application Logs**: `logs/`
- **Nginx Logs**: `logs/nginx/`
- **Docker Logs**: `docker-compose -f docker-compose.prod.yml logs [service]`

### Performance Tuning

#### Database Optimization
```sql
-- Connect to database
\c unitedwerise_prod

-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

#### Application Optimization
- Monitor memory usage with `docker stats`
- Check API response times in Grafana
- Review and optimize database queries
- Consider implementing Redis caching

### Security Checklist

- [ ] SSL certificates are valid and auto-renewing
- [ ] Firewall is configured (UFW or iptables)
- [ ] Database access is restricted
- [ ] Admin panel is IP-restricted
- [ ] Regular security updates are applied
- [ ] Backup encryption is enabled
- [ ] API rate limiting is working
- [ ] Content Security Policy is enforced

## Support

For technical support:
- **Documentation**: Check this deployment guide
- **Logs**: Use `./scripts/deploy.sh logs [service]`
- **Health Checks**: `./scripts/deploy.sh health`
- **Community**: GitHub Issues

## Disaster Recovery

### Full System Recovery

1. **Provision new server** with same specifications
2. **Install Docker and dependencies**
3. **Restore code** from Git repository
4. **Restore database** from latest backup
5. **Update DNS** to point to new server
6. **Deploy application** using deployment script
7. **Verify functionality** with test suite

### Data Recovery

1. **Identify backup** to restore from
2. **Stop application** services
3. **Restore database** using restore script
4. **Restart services** and verify data integrity
5. **Run any necessary migrations**

Remember to test your disaster recovery procedures regularly!