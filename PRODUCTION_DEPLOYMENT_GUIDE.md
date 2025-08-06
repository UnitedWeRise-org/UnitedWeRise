# United We Rise - Production Deployment Guide

## 🚀 **Pre-Deployment Checklist**

### ✅ **Security Implementation Status**
- [x] **Authentication**: bcrypt + JWT with blacklisting
- [x] **Rate Limiting**: Tiered limits for all endpoints
- [x] **Input Validation**: express-validator on all routes
- [x] **Security Headers**: helmet + CORS configuration
- [x] **Error Handling**: Structured logging and sanitized responses
- [x] **Session Management**: Token blacklisting and session control

## 🔧 **Step 1: Environment Setup**

### **1.1 Generate Production Secrets**
```bash
# Generate a cryptographically secure JWT secret
openssl rand -base64 64

# Generate database password
openssl rand -base64 32

# Note these down securely - you'll need them for .env
```

### **1.2 Production Environment File**
Create `backend/.env.production`:
```env
# Database (replace with your production database)
DATABASE_URL="postgresql://unitedwerise_user:SECURE_PASSWORD@your-db-host:5432/unitedwerise_prod?sslmode=require"

# JWT Configuration
JWT_SECRET="your-64-character-secure-jwt-secret-from-openssl"
JWT_EXPIRES_IN="24h"

# Server Configuration
PORT=3001
NODE_ENV="production"

# CORS & Frontend
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# API Keys (get these from respective providers)
GEOCODIO_API_KEY="your-production-geocodio-key"
FEC_API_KEY="your-production-fec-key"

# Rate Limiting (stricter for production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Security
BCRYPT_SALT_ROUNDS=14

# Optional: Redis for session management (recommended)
REDIS_URL="redis://your-redis-host:6379"
```

## 🏗️ **Step 2: Infrastructure Setup**

### **2.1 Database Setup**
```sql
-- Create production database
CREATE DATABASE unitedwerise_prod;

-- Create dedicated application user
CREATE USER unitedwerise_user WITH PASSWORD 'your-secure-password';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE unitedwerise_prod TO unitedwerise_user;
GRANT USAGE ON SCHEMA public TO unitedwerise_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO unitedwerise_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO unitedwerise_user;

-- Enable SSL connections only
-- In postgresql.conf: ssl = on
-- In pg_hba.conf: hostssl all unitedwerise_user 0.0.0.0/0 md5
```

### **2.2 Redis Setup (Optional but Recommended)**
```bash
# Install Redis for session management
# Ubuntu/Debian:
sudo apt update && sudo apt install redis-server

# Configure Redis security
sudo nano /etc/redis/redis.conf

# Add these settings:
# requirepass your-redis-password
# bind 127.0.0.1
# port 6379
```

### **2.3 SSL Certificate**
```bash
# Option 1: Let's Encrypt (Free)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Option 2: Cloudflare (Free SSL + CDN)
# Set up Cloudflare for your domain
# Configure Origin Certificates
```

## 📦 **Step 3: Application Deployment**

### **3.1 Server Preparation**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application user
sudo adduser --system --group unitedwerise
sudo mkdir -p /var/www/unitedwerise
sudo chown unitedwerise:unitedwerise /var/www/unitedwerise
```

### **3.2 Deploy Application**
```bash
# Clone repository to server
cd /var/www/unitedwerise
sudo -u unitedwerise git clone https://github.com/your-repo/UnitedWeRise.git .

# Install dependencies
cd backend
sudo -u unitedwerise npm ci --only=production

# Build application
sudo -u unitedwerise npm run build

# Copy production environment
sudo -u unitedwerise cp .env.production .env

# Run database migrations
sudo -u unitedwerise npx prisma migrate deploy

# Generate Prisma client
sudo -u unitedwerise npx prisma generate
```

### **3.3 Process Management Setup**
```bash
# Create PM2 ecosystem file
sudo -u unitedwerise tee /var/www/unitedwerise/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'unitedwerise-api',
    script: './dist/server.js',
    cwd: '/var/www/unitedwerise/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/unitedwerise/error.log',
    out_file: '/var/log/unitedwerise/out.log',
    log_file: '/var/log/unitedwerise/combined.log',
    time: true
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/unitedwerise
sudo chown unitedwerise:unitedwerise /var/log/unitedwerise

# Start application
sudo -u unitedwerise pm2 start ecosystem.config.js
sudo -u unitedwerise pm2 save
sudo -u unitedwerise pm2 startup
```

## 🔒 **Step 4: Security Hardening**

### **4.1 Firewall Setup**
```bash
# Enable UFW firewall
sudo ufw --force enable

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Block direct access to application port
sudo ufw deny 3001/tcp
```

### **4.2 Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/unitedwerise
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; connect-src 'self' wss:" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth routes (stricter rate limiting)
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files
    location / {
        root /var/www/unitedwerise/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

### **4.3 SSL Security**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/unitedwerise /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL certificate auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 **Step 5: Monitoring & Logging**

### **5.1 Log Rotation**
```bash
# Setup log rotation
sudo tee /etc/logrotate.d/unitedwerise << EOF
/var/log/unitedwerise/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 unitedwerise unitedwerise
    postrotate
        sudo -u unitedwerise pm2 reload unitedwerise-api
    endscript
}
EOF
```

### **5.2 Health Monitoring**
```bash
# Create health check script
sudo tee /usr/local/bin/health-check.sh << EOF
#!/bin/bash
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "API health check failed"
    sudo -u unitedwerise pm2 restart unitedwerise-api
fi
EOF

sudo chmod +x /usr/local/bin/health-check.sh

# Add to crontab
sudo crontab -e
# Add: */5 * * * * /usr/local/bin/health-check.sh
```

## 🧪 **Step 6: Testing Production Deployment**

### **6.1 Run Security Tests**
```bash
# On your local machine, test the production API
cd backend
node test-security.js

# Update the API_BASE in test-security.js to your production URL
# const API_BASE = 'https://yourdomain.com/api';
```

### **6.2 Load Testing**
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test
tee load-test.yml << EOF
config:
  target: https://yourdomain.com
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "API Health Check"
    requests:
      - get:
          url: "/health"
EOF

artillery run load-test.yml
```

## 🚨 **Step 7: Launch Checklist**

### **Final Pre-Launch Verification**
- [ ] Database connection works with SSL
- [ ] All environment variables are set correctly
- [ ] SSL certificate is valid and auto-renewing
- [ ] Rate limiting is working (test with security script)
- [ ] Application starts automatically on server reboot
- [ ] Logs are being written and rotated
- [ ] Health checks are functional
- [ ] Backup strategy is implemented
- [ ] Error tracking/monitoring is set up

### **Launch Day Tasks**
1. **Final backup** of development data
2. **Run database migrations** on production
3. **Update DNS** to point to production server
4. **Monitor logs** for first few hours
5. **Test all critical functionality**
6. **Verify security measures** are working

## 📞 **Post-Launch Maintenance**

### **Daily**
- Check application logs for errors
- Monitor server resources (CPU, memory, disk)
- Verify SSL certificate status

### **Weekly**
- Review security logs
- Update dependencies if needed
- Check backup integrity

### **Monthly**
- Security audit
- Performance review
- Update system packages

---

## 🆘 **Emergency Procedures**

### **If Site Goes Down**
```bash
# Check application status
sudo -u unitedwerise pm2 status

# Restart application
sudo -u unitedwerise pm2 restart unitedwerise-api

# Check logs
sudo -u unitedwerise pm2 logs

# Check database connection
psql -h your-db-host -U unitedwerise_user unitedwerise_prod
```

### **If Under Attack**
```bash
# Enable emergency rate limiting
sudo nginx -s reload

# Block specific IPs
sudo ufw deny from ATTACKER_IP

# Monitor in real-time
tail -f /var/log/nginx/access.log
```

**🎉 Your United We Rise platform is now ready for production!** 

Remember to keep all credentials secure and follow the maintenance schedule to keep your platform secure and performant.