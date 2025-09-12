# Security Guidelines - United We Rise
## Enterprise-Grade Social Media Platform Security Standards

### Version: 1.0.0
### Last Updated: September 12, 2025
### Security Level: ENTERPRISE (SOC 2 / OWASP Compliant)

---

## 🛡️ AUTHENTICATION & SESSION MANAGEMENT

### Cookie-Based Authentication (Current Standard)
```javascript
// ✅ SECURE: Use httpOnly cookies for authentication
// Automatically handled by backend auth routes

// ❌ INSECURE: Do not store auth tokens in localStorage
localStorage.setItem('authToken', token); // PROHIBITED

// ✅ SECURE: Proper API calls with credentials
fetch('/api/endpoint', {
  method: 'POST',
  credentials: 'include', // Required for cookie authentication
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken() // Required for state-changing requests
  }
});
```

### CSRF Protection Implementation
```javascript
// ✅ SECURE: Get CSRF token from cookie
function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
}

// ✅ SECURE: Include CSRF token in all POST/PUT/DELETE requests
headers: {
  'X-CSRF-Token': getCsrfToken()
}
```

### Session Security Standards
- **Timeout**: 24-hour sessions with automatic renewal
- **Token Blacklisting**: Immediate revocation capability
- **Cookie Flags**: httpOnly, secure, sameSite=Strict
- **TOTP Integration**: 2FA with secure session extension

---

## 🔒 XSS PROTECTION

### Content Security Policy (CSP)
```javascript
// Current CSP configuration in server.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
```

### Input Sanitization
```javascript
// ✅ SECURE: All user content is sanitized through Prisma ORM
// No direct SQL queries - prevents injection attacks

// ✅ SECURE: HTML content sanitization in frontend
function sanitizeHtml(content) {
  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}
```

---

## 🚨 SECURITY INCIDENT RESPONSE

### Immediate Response Checklist
1. **Identify Scope**: Which systems/users affected?
2. **Isolate**: Revoke compromised tokens/sessions
3. **Document**: Log all incident details
4. **Notify**: Alert relevant stakeholders
5. **Remediate**: Apply fixes and patches
6. **Monitor**: Enhanced monitoring post-incident

### Token Revocation Procedure
```bash
# Emergency token blacklisting
curl -X POST "https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api/auth/revoke-all" \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "X-CSRF-Token: [CSRF_TOKEN]"
```

### Security Monitoring Endpoints
- `/api/security-metrics` - Real-time security dashboard data
- `/health` - System health with security indicators
- `/metrics` - Prometheus metrics for alerting

---

## 📊 SECURITY METRICS & MONITORING

### Key Security Indicators
```javascript
// Authentication success rate
auth_success_rate = (total_attempts - failures) / total_attempts * 100

// CSRF protection effectiveness
csrf_protection_rate = csrf_validations / (csrf_validations + csrf_failures) * 100

// Session security health
session_security_score = active_sessions / total_user_sessions * 100
```

### Alert Thresholds
- **Authentication Failure Rate** > 10%: Medium Alert
- **Authentication Failure Rate** > 25%: High Alert
- **CSRF Failure Rate** > 5%: High Alert
- **Suspended Users Spike** > 20% increase: Investigation Required

---

## 🔧 DEVELOPMENT SECURITY PRACTICES

### Code Review Security Checklist
- [ ] No hardcoded secrets or API keys
- [ ] Proper error handling without information disclosure
- [ ] Input validation on all user inputs
- [ ] Authorization checks on all protected endpoints
- [ ] HTTPS-only connections in production
- [ ] Rate limiting on authentication endpoints

### Secure Coding Patterns
```typescript
// ✅ SECURE: Proper error handling
try {
  const result = await secureOperation();
  return { success: true, data: result };
} catch (error) {
  // Log detailed error for debugging
  console.error('Operation failed:', error);
  // Return generic error to user
  return { success: false, error: 'Operation failed' };
}

// ✅ SECURE: Input validation
const validatedInput = await schema.parseAsync(userInput);

// ✅ SECURE: Authorization middleware
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);
```

### Environment Security
```bash
# ✅ SECURE: Environment variable patterns
STRIPE_SECRET_KEY=sk_live_... # Never in code
JWT_SECRET=<256-bit-random>   # Cryptographically secure
DATABASE_URL=postgresql://... # Connection string only

# ❌ INSECURE: Never commit these to repository
# .env files should be in .gitignore
```

---

## 🏢 ENTERPRISE COMPLIANCE

### SOC 2 Type II Readiness
- [x] **Access Control**: Role-based permissions with admin/moderator tiers
- [x] **Data Encryption**: TLS 1.3 in transit, encrypted at rest
- [x] **Audit Logging**: Comprehensive security event tracking
- [x] **Incident Response**: Documented procedures and automated monitoring
- [x] **Vulnerability Management**: Regular security assessments

### OWASP Top 10 Protection
- [x] **A01 Broken Access Control**: JWT + Role-based authorization
- [x] **A02 Cryptographic Failures**: Proper hashing, secure cookies
- [x] **A03 Injection**: Prisma ORM prevents SQL injection
- [x] **A04 Insecure Design**: Security-first architecture
- [x] **A05 Security Misconfiguration**: Helmet.js security headers
- [x] **A06 Vulnerable Components**: Regular dependency updates
- [x] **A07 Authentication Failures**: TOTP 2FA, secure sessions
- [x] **A08 Data Integrity**: CSRF protection, input validation
- [x] **A09 Logging Failures**: Comprehensive security monitoring
- [x] **A10 SSRF**: Input validation on external requests

---

## 🚀 DEPLOYMENT SECURITY

### Production Deployment Checklist
- [ ] Environment variables properly configured
- [ ] HTTPS certificates valid and auto-renewing
- [ ] Database connections encrypted
- [ ] Security headers properly configured
- [ ] Rate limiting active and tested
- [ ] Monitoring and alerting operational

### Azure Security Configuration
```bash
# Container Apps security settings
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --min-replicas 1 \
  --max-replicas 10 \
  --secrets STRIPE_SECRET_KEY="sk_live_..." JWT_SECRET="..."

# PostgreSQL security
az postgres flexible-server parameter set \
  --server-name unitedwerise-db \
  --resource-group unitedwerise-rg \
  --name ssl_mode \
  --value require
```

---

## 📱 CLIENT-SIDE SECURITY

### Frontend Security Patterns
```javascript
// ✅ SECURE: Content sanitization
function displayUserContent(content) {
  const sanitized = DOMPurify.sanitize(content);
  element.innerHTML = sanitized;
}

// ✅ SECURE: URL validation
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

// ✅ SECURE: File upload validation
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return allowedTypes.includes(file.type) && file.size <= maxSize;
}
```

### Mobile Security Considerations
- Touch-friendly authentication flows
- Secure file upload handling
- Responsive security UI components
- Network timeout handling

---

## 🔍 SECURITY TESTING

### Regular Security Assessments
- **Weekly**: Automated vulnerability scans
- **Monthly**: Penetration testing simulation
- **Quarterly**: Third-party security audit
- **Annual**: Comprehensive security review

### Testing Checklist
```bash
# Authentication testing
curl -X POST "/api/auth/login" -d '{"email":"test@example.com","password":"wrong"}'
# Should return 401 without user information disclosure

# CSRF testing
curl -X POST "/api/posts" -H "Content-Type: application/json"
# Should return 403 CSRF token missing

# Authorization testing
curl -X GET "/api/admin/users" -H "Authorization: Bearer [USER_TOKEN]"
# Should return 403 Admin access required
```

---

## 📞 EMERGENCY CONTACTS

### Security Team Contacts
- **Primary**: Development Team Lead
- **Secondary**: System Administrator
- **Escalation**: Project Owner

### External Resources
- **OWASP Guidelines**: https://owasp.org/
- **Azure Security Center**: Azure Portal → Security Center
- **Stripe Security**: https://stripe.com/docs/security

---

**📋 This document should be reviewed monthly and updated with any new security implementations or threat landscape changes.**