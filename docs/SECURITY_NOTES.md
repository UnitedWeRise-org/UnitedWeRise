# Security Notes

This document records intentional security design decisions that may appear as findings in automated security scans but are safe by design.

Last updated: 2026-01-06

---

## 1. CDN Resources Without Subresource Integrity (SRI)

### Summary

Some external CDN resources in `frontend/index.html` do not use SRI hashes. This is intentional and documented in the HTML file itself.

### Resources WITH SRI (Recommended Pattern)

The following versioned, immutable resources use SRI for tamper protection:

| Resource | CDN | SRI Status |
|----------|-----|------------|
| MapLibre GL CSS | unpkg.com | Enabled |
| MapLibre GL JS | unpkg.com | Enabled |
| Socket.io | cdn.socket.io | Enabled |

Example:
```html
<script src="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js"
        integrity="sha384-C8SvKhT0WT55AOw5pvwVG699JuuZgN0KFt/4wtpRPhSl+TzRYqDUravAfuy13vJK"
        crossorigin="anonymous"></script>
```

### Resources WITHOUT SRI (Intentional Exceptions)

| Resource | CDN | Reason for Exception |
|----------|-----|----------------------|
| **Stripe.js** | js.stripe.com | Stripe explicitly recommends against SRI. Their script auto-updates for security patches and PCI compliance. Adding SRI would break the auto-update mechanism and could leave applications vulnerable. |
| **hCaptcha** | js.hcaptcha.com | Dynamic captcha script that updates frequently to combat bot evasion. SRI hashes would become stale within hours or days. |
| **Google Ads/Analytics** | googletagmanager.com | Script content changes frequently (every few minutes) for A/B testing and feature rollout. SRI would break tracking entirely. |
| **Flatpickr** | cdn.jsdelivr.net | Used only in admin dashboard. jsDelivr provides its own integrity through versioned URLs. Adding SRI is a future enhancement option. |

### Security Mitigations

Even without SRI, these resources maintain security through:

1. **HTTPS Only**: All CDN resources are loaded over HTTPS
2. **Trusted Vendors**: Stripe, Google, and hCaptcha are PCI/SOC2 compliant providers
3. **Versioned URLs**: Where possible, specific versions are pinned (e.g., `maplibre-gl@4.0.0`)
4. **Content Security Policy**: CSP headers restrict script sources to approved domains

### Maintenance

When upgrading MapLibre GL or Socket.io versions, regenerate SRI hashes:

```bash
# Generate SHA-384 hash for a CDN resource
curl -sL 'https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js' | openssl dgst -sha384 -binary | openssl base64 -A
```

---

## 2. OAuth Client ID Exposure

### Summary

The Google OAuth Client ID appears in frontend JavaScript code and HTML. This is intentional and secure per the OAuth 2.0 specification.

### Location

The Client ID is defined in:
- `/frontend/src/handlers/auth-handlers.js` (line 26)
- `/CLAUDE.md` (configuration reference)

```javascript
this.googleClientId = '496604941751-663p6eiqo34iumaet9tme4g19msa1bf0.apps.googleusercontent.com';
```

### Why This Is Safe

OAuth 2.0 explicitly separates credentials into public and private components:

| Credential | Location | Purpose | Security Status |
|------------|----------|---------|-----------------|
| **Client ID** | Frontend (public) | Identifies the application to Google's OAuth server | **Safe to expose** - by design |
| **Client Secret** | Backend only (env vars) | Authenticates the application server-to-server | **Never exposed** - would be a vulnerability |

### How OAuth 2.0 Flow Works

1. **Frontend uses Client ID** to redirect users to Google's consent screen
2. User authenticates directly with Google (credentials never touch our servers)
3. Google redirects back with a temporary authorization code
4. **Backend uses Client Secret** (server-side only) to exchange code for tokens
5. Tokens are validated against the expected Client ID (audience check)

### Security Controls

The Client ID alone cannot be abused because:

1. **Redirect URI Validation**: Google only redirects to pre-registered URIs
   - Registered domains: `unitedwerise.org`, `dev.unitedwerise.org`, `admin.unitedwerise.org`
   - Attackers cannot receive tokens even with the Client ID

2. **Audience Verification**: Backend validates token audience matches our Client ID
   ```typescript
   if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
     // Reject token - issued for different application
   }
   ```

3. **Token Validation**: ID tokens are cryptographically signed by Google
   - Signature verification ensures tokens are genuine
   - Cannot be forged even with knowledge of Client ID

### Industry Standard

This pattern is used by all major OAuth implementations:
- Google Sign-In documentation explicitly shows Client ID in frontend code
- Facebook Login, GitHub OAuth, Microsoft Identity follow the same pattern
- The OAuth 2.0 RFC defines Client ID as a public identifier

### References

- [Google Identity: Using OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [RFC 6749 - OAuth 2.0 Client Identifier](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2)

---

## 3. Other Intentional Security Decisions

### Admin Subdomain Isolation

Admin dashboard is only accessible via `admin.unitedwerise.org` and `dev-admin.unitedwerise.org`. Accessing `admin-dashboard.html` from the main site redirects to the admin subdomain. This is enforced by:

1. Frontend redirect script in `admin-dashboard.html`
2. Backend environment-aware authentication middleware (`requireStagingAuth`)

### HttpOnly Cookies

Authentication tokens are stored in HttpOnly cookies. This means:
- `document.cookie` will NOT show the auth token (this is correct and secure)
- Authentication status should be verified via `/auth/me` endpoint, not cookie inspection
- Prevents XSS attacks from stealing tokens

### Staging Environment Admin-Only Access

The staging environment (`dev.unitedwerise.org` / `dev-api.unitedwerise.org`) restricts access to admin users only. This prevents:
- Accidental user access to unstable features
- Data confusion between environments
- Testing interference from non-admin users

---

## Document History

| Date | Change |
|------|--------|
| 2026-01-06 | Initial creation documenting SRI exceptions and OAuth Client ID exposure |
