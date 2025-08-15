# Representative API Setup

We use a hybrid approach combining multiple APIs for comprehensive representative data.

## Primary Configuration - Google Civic Information API

### Google Maps Platform (with Nonprofit Credits)
- **Status**: PRIMARY SOURCE - Using Google for Nonprofits free credits
- **Features**: 
  - Address autocomplete (Places API)
  - Representative lookup (Civic Information API)
  - Election information and polling locations
- **Data**: Federal, state, and local officials with photos and social media

**Setup:**
1. Apply for Google for Nonprofits at https://www.google.com/nonprofits/
2. Once approved, get Google Maps Platform credits
3. Create two API keys in Google Cloud Console:
   - Frontend key (HTTP referrer restrictions)
   - Backend key (IP address restrictions)
4. Enable these APIs:
   - Maps JavaScript API (frontend)
   - Places API (frontend)
   - Civic Information API (backend)
   - Geocoding API (backend)

## Secondary Configuration - Enhanced Data

### 1. Geocodio (Enhanced Data Source)
- **Status**: ACTIVE - Used for additional data not in Google Civic
- **Free Tier**: 2,500 lookups per day
- **Unique Features**: 
  - School district boundaries
  - State legislative districts
  - Biographical information
  - Campaign finance IDs
- **Data**: Federal + state legislative + school districts

**Setup:**
1. Sign up at https://www.geocod.io/
2. Get your API key from the dashboard
3. Add to your `.env` file:
   ```
   GEOCODIO_API_KEY=your_key_here
   ```

### 2. FEC OpenFEC API (Backup)
- **Free**: Yes (with rate limits)
- **Features**: Federal candidate and campaign finance data
- **Data**: Current and historical federal candidates

**Setup:**
1. Sign up at https://api.data.gov/
2. Get your API key
3. Add to your `.env` file:
   ```
   FEC_API_KEY=your_key_here
   ```

### 3. Ballotpedia API (Future Option)
- **Features**: Comprehensive political data at all levels
- **Status**: API documentation requires registration

## Current Implementation

The system now uses an intelligent merge approach:

1. **Parallel Fetch**: Query both Google Civic and Geocodio simultaneously
2. **Data Merge**: Combine results for comprehensive coverage:
   - Google Civic provides base federal/state/local officials
   - Geocodio adds school districts and enhanced metadata
   - Duplicate detection by name with field enhancement
3. **Caching**: Store merged results for 7-30 days
4. **Source Tracking**: Response indicates data sources used

## API Endpoints

### Get Representatives for User
```
GET /api/political/representatives
Authorization: Bearer <token>
Query: ?forceRefresh=true (optional)
```

### Get Representatives by Location
```
GET /api/political/representatives/:zipCode/:state
Query: ?forceRefresh=true (optional)
```

### Refresh Representatives Data
```
POST /api/political/representatives/refresh
Authorization: Bearer <token>
```

## Response Format

```json
{
  "representatives": {
    "federal": [
      {
        "name": "Nikki Budzinski",
        "office": "U.S. Representative, IL-13",
        "party": "Democratic",
        "phones": ["+1-202-225-2371"],
        "emails": ["https://budzinski.house.gov/contact"],
        "urls": [
          "https://budzinski.house.gov",
          "https://bioguide.congress.gov/search/bio/B001312"
        ],
        "photoUrl": "https://bioguide.congress.gov/bioguide/photo/B/B001312.jpg",
        "address": {
          "line1": "1019 Longworth House Office Building",
          "city": "Washington",
          "state": "DC",
          "zip": "20515"
        },
        "district": "IL-13",
        "level": "federal",
        "type": "representative",
        "bio": {
          "first_name": "Nikki",
          "last_name": "Budzinski",
          "birthday": "1977-03-11",
          "gender": "F",
          "party": "Democratic"
        },
        "social": {
          "twitter": "RepBudzinski",
          "facebook": "RepNikkiBudzinski"
        },
        "references": {
          "bioguide_id": "B001312",
          "govtrack_id": "456789",
          "opensecrets_id": "N00012345"
        }
      }
    ],
    "state": [],
    "local": []
  },
  "totalCount": 3,
  "location": {
    "zipCode": "62701",
    "state": "IL",
    "city": "Springfield",
    "coordinates": {
      "lat": 39.7817,
      "lng": -89.6501
    }
  },
  "source": "geocodio",
  "lastUpdated": "2025-08-05T15:30:00.000Z",
  "cached": false
}
```

## Testing the Setup

Run the test script to verify your API keys work:

```bash
cd backend
node test-geocodio.js
```

Expected output:
```
🔑 Geocodio API Key found: abc123...
📍 Testing address: 62701, IL
📊 Response status: 200
🏛️ Congressional District Info:
- District: 13
- State: IL
👥 Current Legislators:
  1. Nikki Budzinski (representative) - Democratic
  2. Dick Durbin (senator) - Democratic
  3. Tammy Duckworth (senator) - Democratic
```

## Migration Notes

### Changes from Google Civic API:
- **Field Names**: `officials` → `representatives`
- **Structure**: Added `level` field and `source` tracking
- **Grouping**: More reliable level classification
- **Caching**: Enhanced database storage with provider tracking

### Frontend Updates Needed:
- Update API calls to use new endpoint structure
- Handle new response format with `representatives` instead of `officials`
- Add display for `source` field to show data provider
- Update error handling for multiple API failures

## Rate Limits & Costs

- **Geocodio**: 2,500 free requests/day, then $0.50/1000 requests
- **FEC**: Free with rate limits (1000 requests/hour)
- **Caching**: 30-day TTL reduces API usage significantly

## Troubleshooting

### No API Keys Configured
```
console.warn('No API keys configured for representative lookup');
```
**Solution**: Add at least one API key to your `.env` file

### Geocodio API Error
- Check API key is valid
- Verify you haven't exceeded daily limits
- Ensure address format is correct

### FEC API Limitations
- Only provides federal candidates
- Requires additional processing to match districts
- Better for campaign finance data than representative lookup

### Database Issues
- Check Prisma connection
- Verify `ExternalOfficial` model exists
- Clear cache: Update `lastUpdated` filter in database queries