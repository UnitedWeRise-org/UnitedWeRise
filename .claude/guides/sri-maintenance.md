# Subresource Integrity (SRI) Maintenance Guide

**Date Created:** 2025-11-11
**Last Updated:** 2025-11-11

---

## Overview

UnitedWeRise implements Subresource Integrity (SRI) on 3 out of 7 CDN resources (43% coverage) to protect against CDN tampering attacks. This guide explains how to maintain SRI hashes when upgrading library versions.

---

## SRI-Enabled Resources

### 1. MapLibre GL CSS
**File:** `frontend/index.html`
**Current Version:** 4.0.0
**CDN URL:** `https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css`
**Current Hash (SHA-384):** `lwiCiEXwjwuSiTeYhtgeL/ADQBiUjDsQkKHCwT0j+8iKuBrb7skjKQAYQ+cpZspI`

### 2. MapLibre GL JS
**File:** `frontend/index.html`
**Current Version:** 4.0.0
**CDN URL:** `https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js`
**Current Hash (SHA-384):** `C8SvKhT0WT55AOw5pvwVG699JuuZgN0KFt/4wtpRPhSl+TzRYqDUravAfuy13vJK`

### 3. Socket.io
**File:** `frontend/index.html`
**Current Version:** 4.7.5
**CDN URL:** `https://cdn.socket.io/4.7.5/socket.io.min.js`
**Current Hash (SHA-384):** `2huaZvOR9iDzHqslqwpR87isEmrfxqyWOF7hr7BY6KG0+hVKLoEXMPUJw3ynWuhO`

---

## When to Update SRI Hashes

### ✅ UPDATE Required:
- When upgrading to a new library version
- When changing CDN provider
- When switching between minified/unminified versions

### ❌ UPDATE NOT Required:
- Regular code deploys (hashes don't change unless libraries upgrade)
- Backend changes (SRI only applies to frontend CDN resources)

---

## How to Update SRI Hashes

### Method 1: Generate Hash from URL (Recommended)

```bash
# Generic command
curl -sL 'CDN_URL_HERE' | openssl dgst -sha384 -binary | openssl base64 -A

# Example: MapLibre GL JS 4.1.0 (hypothetical upgrade)
curl -sL 'https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.js' | openssl dgst -sha384 -binary | openssl base64 -A
```

**Output:** `sha384-HASH_GOES_HERE` (copy the hash part only)

### Method 2: Use unpkg.com Metadata

```bash
# For unpkg.com resources, add ?meta to URL
curl 'https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js?meta'
```

**Look for:** `integrity` field in JSON response

### Method 3: Use jsDelivr (Alternative CDN)

jsDelivr provides automatic SRI hash generation:

```bash
# Change URL to jsDelivr and add ?sri=sha384
https://cdn.jsdelivr.net/npm/maplibre-gl@4.0.0/dist/maplibre-gl.js?sri=sha384
```

**Response includes:** `integrity` attribute with SHA-384 hash

---

## Step-by-Step Upgrade Procedure

### Example: Upgrading MapLibre GL from 4.0.0 to 4.1.0

#### Step 1: Generate New Hashes

```bash
# MapLibre GL CSS
curl -sL 'https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.css' | openssl dgst -sha384 -binary | openssl base64 -A

# MapLibre GL JS
curl -sL 'https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.js' | openssl dgst -sha384 -binary | openssl base64 -A
```

**Save the output hashes** (they will look like random alphanumeric strings)

#### Step 2: Update index.html

**Find CSS link:**
```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css"
      integrity="sha384-OLD_HASH_HERE"
      crossorigin="anonymous" />
```

**Update to:**
```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.css"
      integrity="sha384-NEW_HASH_HERE"
      crossorigin="anonymous" />
```

**Find JS script:**
```html
<script src="https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.js"
        integrity="sha384-OLD_HASH_HERE"
        crossorigin="anonymous"></script>
```

**Update to:**
```html
<script src="https://unpkg.com/maplibre-gl@4.1.0/dist/maplibre-gl.js"
        integrity="sha384-NEW_HASH_HERE"
        crossorigin="anonymous"></script>
```

#### Step 3: Test Locally

1. Open `frontend/index.html` in browser
2. Open DevTools → Console
3. Check for SRI errors:
   - ❌ **Error:** `Failed to find a valid digest in the 'integrity' attribute`
   - ✅ **Success:** No SRI errors, map loads correctly

#### Step 4: Test in Staging

1. Deploy to staging (`dev.unitedwerise.org`)
2. Test map functionality:
   - Map renders correctly
   - Layers load
   - Interactions work (zoom, pan, click)
3. Check browser console for errors

#### Step 5: Deploy to Production

1. Merge to main branch
2. Verify production deployment
3. Monitor for SRI errors in production logs

---

## Troubleshooting

### Error: "Failed to find a valid digest in the 'integrity' attribute"

**Cause:** Hash doesn't match the file content

**Solutions:**
1. Regenerate hash from exact URL
2. Verify version number in URL matches CDN
3. Check for typos in hash string
4. Ensure you copied full hash (SHA-384 hashes are 64 characters base64-encoded)

### Error: "Cross-Origin Request Blocked"

**Cause:** Missing `crossorigin="anonymous"` attribute

**Solution:** Add `crossorigin="anonymous"` to script/link tag

### Error: Library functionality broken after upgrade

**Cause:** API changes in new library version

**Solutions:**
1. Check library changelog for breaking changes
2. Update frontend code to match new API
3. Test thoroughly in staging before production
4. Consider staying on current version if breaking changes are significant

---

## Resources NOT Using SRI

### Why These Can't Use SRI

#### 1. Stripe.js v3
**Reason:** Vendor explicitly recommends against SRI
**Why:** Auto-updates for critical security patches. SRI would break payments when Stripe updates.
**Compensating Controls:** HTTPS + CSP domain whitelisting

#### 2. hCaptcha
**Reason:** Dynamic script, not compatible with SRI
**Why:** CAPTCHA challenges update frequently to prevent bot abuse
**Compensating Controls:** HTTPS + CSP domain whitelisting

#### 3. Google Tag Manager (gtag.js)
**Reason:** Fundamentally incompatible with SRI
**Why:** Script content changes every few minutes, CORS headers don't support SRI
**Compensating Controls:** HTTPS + CSP domain whitelisting

#### 4. Leaflet (if re-enabled)
**Current Status:** Loaded via smart-loader.js, not direct HTML tag
**If Re-Enabled:** Can use SRI (versioned on unpkg.com)

---

## Security Best Practices

### DO:
- ✅ Update SRI hashes when upgrading library versions
- ✅ Test in staging before production after hash updates
- ✅ Use SHA-384 or SHA-512 (stronger than SHA-256)
- ✅ Keep this guide updated when adding/removing SRI resources
- ✅ Document hash updates in CHANGELOG.md

### DON'T:
- ❌ Add SRI to auto-updating scripts (Stripe, hCaptcha, GTM)
- ❌ Use SHA-256 (weaker, prefer SHA-384)
- ❌ Skip `crossorigin="anonymous"` attribute
- ❌ Deploy to production without staging testing
- ❌ Use SRI on self-hosted resources (unnecessary, adds complexity)

---

## Maintenance Checklist

When upgrading a SRI-protected library:

- [ ] Generate new SHA-384 hash for new version
- [ ] Update version number in CDN URL
- [ ] Update `integrity` attribute with new hash
- [ ] Verify `crossorigin="anonymous"` still present
- [ ] Test locally - check browser console for SRI errors
- [ ] Deploy to staging
- [ ] Test all library functionality in staging
- [ ] Monitor staging for 24-48 hours
- [ ] Deploy to production
- [ ] Update this guide if version/hash changed
- [ ] Document change in CHANGELOG.md

---

## Contact & Support

**Questions about SRI implementation?**
See `.claude/scratchpads/SECURITY-AUDIT-TRACKING.md` for security audit details

**Reporting SRI errors in production?**
Check browser console for specific error messages, include in incident report

**Library upgrade breaking changes?**
Review library changelog first:
- MapLibre: https://github.com/maplibre/maplibre-gl-js/releases
- Socket.io: https://socket.io/docs/v4/changelog/

---

**Last Updated:** 2025-11-11
**Next Review:** When upgrading any SRI-protected library
