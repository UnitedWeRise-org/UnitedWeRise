# Google Maps Platform Integration Guide

This document details the Google Maps Platform integration for UnitedWeRise, utilizing Google for Nonprofits credits.

## Overview

UnitedWeRise leverages Google Maps Platform APIs to provide:
- **Address Autocomplete** - Smart address input for user registration and representative lookup
- **Civic Information** - Comprehensive data about elected officials and elections
- **Geocoding** - Address to coordinate conversion for location-based features

## Architecture

### Two-Key System

We use separate API keys for security and proper restrictions:

1. **Frontend Key** (`UnitedWeRise Google Maps Frontend`)
   - Used in browser JavaScript
   - HTTP referrer restrictions
   - APIs: Maps JavaScript, Places

2. **Backend Key** (`UnitedWeRise Google Maps Backend`)
   - Used for server-side API calls
   - IP address restrictions
   - APIs: Civic Information, Geocoding

## Frontend Implementation

### Address Autocomplete

**Location**: `frontend/src/js/google-address-autocomplete.js`

**Features**:
- Autocomplete for registration form address field
- Dynamic address input for officials panel
- Restricted to US addresses only
- Extracts full address components (street, city, state, zip)

**Integration Points**:
```javascript
// Registration form
<input type="text" id="registerAddress" placeholder="Start typing your address...">

// Officials panel (dynamically added)
<input type="text" id="lookupAddress" placeholder="Start typing your address...">
```

### Google Maps Script Loading

**Location**: `frontend/index.html`

```html
<script async defer 
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_FRONTEND_KEY&libraries=places&callback=initGoogleMaps">
</script>
```

The script loads asynchronously and calls `initGoogleMaps()` when ready.

## Backend Implementation

### Google Civic Service

**Location**: `backend/src/services/googleCivicService.ts`

**Capabilities**:
- Fetch representatives by address
- Get election information
- Retrieve polling locations
- Transform data to standard format

### Representative Service Enhancement

**Location**: `backend/src/services/representativeService.ts`

**Merge Strategy**:
```typescript
1. Fetch from Google Civic (comprehensive federal/state/local data)
2. Fetch from Geocodio (school districts, enhanced metadata)
3. Merge results intelligently:
   - Avoid duplicates by name matching
   - Enhance records with additional fields
   - Preserve unique data from each source
4. Cache merged results for optimal performance
```

### API Endpoints

**New Routes**: `backend/src/routes/googleCivic.ts`

- `GET /api/google-civic/representatives` - Direct Google Civic lookup
- `GET /api/google-civic/elections` - Election information

**Enhanced Routes**:
- `GET /api/political/representatives` - Now returns merged data from multiple sources

## Configuration

### Environment Variables

**Backend** (`.env`):
```bash
# Google Maps API (for backend Civic Information API calls)
GOOGLE_MAPS_API_KEY="your-backend-api-key"

# Keep Geocodio for enhanced data
GEOCODIO_API_KEY="your-geocodio-key"
```

### API Key Security

#### Frontend Key Restrictions:
- **Type**: HTTP referrers (websites)
- **Allowed referrers**:
  - `https://unitedwerise.org/*`
  - `https://www.unitedwerise.org/*`
  - `http://localhost:3000/*`
  - `http://localhost:8080/*`

#### Backend Key Restrictions:
- **Type**: IP addresses
- **Allowed IPs**:
  - `51.8.55.32` (Azure Container App)
  - `20.80.136.242` (unitedwerise.org)
  - `20.36.155.201` (Azure Static Web App)

⚠️ **Note**: Azure IPs may change. Monitor for failures and update as needed.

## Data Flow

### Address Autocomplete Flow:
1. User types in address field
2. Google Places API suggests addresses
3. User selects an address
4. Full address data extracted and stored
5. Address used for representative lookup

### Representative Lookup Flow:
1. Address sent to backend
2. Backend queries both Google Civic and Geocodio
3. Results merged for comprehensive data
4. Cached for future requests
5. Returned to frontend with source attribution

## Benefits of Hybrid Approach

### Google Civic Provides:
- ✅ Comprehensive federal officials
- ✅ State-wide elected officials
- ✅ Local government officials
- ✅ Photos and social media
- ✅ Office contact information
- ✅ Election and polling data

### Geocodio Provides:
- ✅ School district boundaries
- ✅ State legislative districts
- ✅ Biographical information
- ✅ Campaign finance IDs
- ✅ Additional metadata
- ✅ Historical data

### Combined Result:
Users receive the most comprehensive civic data available, leveraging the strengths of both services while maximizing the value of Google's nonprofit credits.

## Testing

### Local Development:
1. Ensure both API keys are configured
2. Test address autocomplete in registration form
3. Verify representative lookup returns merged data
4. Check browser console for Google Maps initialization

### Production:
1. Verify API key restrictions are active
2. Monitor Google Cloud Console for usage
3. Check response `source` field to confirm data merging
4. Test from various locations to ensure IP restrictions work

## Monitoring

### Google Cloud Console:
- Monitor API usage against nonprofit quota
- Check for restriction violations
- Review error rates

### Application Logs:
- Watch for API failures
- Monitor cache hit rates
- Track merge success rates

## Troubleshooting

### Common Issues:

**"This API key is not authorized"**
- Check HTTP referrer or IP restrictions
- Ensure correct APIs are enabled
- Wait 5 minutes for changes to propagate

**Address autocomplete not showing**
- Verify Places API is enabled
- Check browser console for errors
- Ensure frontend key is in HTML

**No representatives returned**
- Verify backend key has Civic Information API enabled
- Check address format is valid
- Review merge logic for errors

## Future Enhancements

### Potential Additions:
- Districts overlay on map
- Polling location directions
- Voter registration status check
- Election reminders
- Candidate comparison tools

### Cost Optimization:
- Monitor usage patterns
- Implement smart caching strategies
- Consider batch processing for bulk lookups
- Use webhooks for election updates

---

**Last Updated**: November 2024
**Maintained By**: UnitedWeRise Development Team
**Google Nonprofit Status**: Active ✅