/**
 * @module js/map-dummy-data
 * @description Dummy map data for testing and development
 *
 * Provides sample geolocation data for testing map features
 * without requiring real API data.
 *
 * Development/testing only - provides fallback content when real posts are not available.
 * TO DISABLE: Set window.MAP_USE_DUMMY_DATA = false
 *
 * Migrated to ES6 modules: October 11, 2025 (Batch 4)
 */

// Curated on-land US coordinates used for fallback/dummy bubbles.
// (Random lat/lng inside a bounding box lands in the ocean frequently; these
// are real city coordinates spread across the country instead.)
const US_LAND_POINTS = [
    [-74.0060, 40.7128],   // New York, NY
    [-118.2437, 34.0522],  // Los Angeles, CA
    [-87.6298, 41.8781],   // Chicago, IL
    [-95.3698, 29.7604],   // Houston, TX
    [-112.0740, 33.4484],  // Phoenix, AZ
    [-75.1652, 39.9526],   // Philadelphia, PA
    [-98.4936, 29.4241],   // San Antonio, TX
    [-117.1611, 32.7157],  // San Diego, CA
    [-96.7970, 32.7767],   // Dallas, TX
    [-121.8863, 37.3382],  // San Jose, CA
    [-97.7431, 30.2672],   // Austin, TX
    [-81.6557, 30.3322],   // Jacksonville, FL
    [-97.3308, 32.7555],   // Fort Worth, TX
    [-82.9988, 39.9612],   // Columbus, OH
    [-80.8431, 35.2271],   // Charlotte, NC
    [-122.4194, 37.7749],  // San Francisco, CA
    [-86.1581, 39.7684],   // Indianapolis, IN
    [-122.3321, 47.6062],  // Seattle, WA
    [-104.9903, 39.7392],  // Denver, CO
    [-77.0369, 38.9072],   // Washington, DC
    [-71.0589, 42.3601],   // Boston, MA
    [-86.7816, 36.1627],   // Nashville, TN
    [-83.0458, 42.3314],   // Detroit, MI
    [-122.6765, 45.5231],  // Portland, OR
    [-115.1398, 36.1699],  // Las Vegas, NV
    [-90.0490, 35.1495],   // Memphis, TN
    [-85.7585, 38.2527],   // Louisville, KY
    [-76.6122, 39.2904],   // Baltimore, MD
    [-87.9065, 43.0389],   // Milwaukee, WI
    [-106.6504, 35.0844],  // Albuquerque, NM
    [-110.9747, 32.2226],  // Tucson, AZ
    [-119.7871, 36.7378],  // Fresno, CA
    [-121.4944, 38.5816],  // Sacramento, CA
    [-94.5786, 39.0997],   // Kansas City, MO
    [-84.3880, 33.7490],   // Atlanta, GA
    [-95.9345, 41.2565],   // Omaha, NE
    [-78.6382, 35.7796],   // Raleigh, NC
    [-80.1918, 25.7617],   // Miami, FL
    [-90.0715, 29.9511],   // New Orleans, LA
    [-81.6944, 41.4993],   // Cleveland, OH
    [-79.9959, 40.4406],   // Pittsburgh, PA
    [-90.1994, 38.6270],   // St. Louis, MO
    [-84.5120, 39.1031],   // Cincinnati, OH
    [-93.2650, 44.9778],   // Minneapolis, MN
    [-111.8910, 40.7608],  // Salt Lake City, UT
    [-116.2023, 43.6150],  // Boise, ID
    [-149.9003, 61.2181],  // Anchorage, AK
    [-157.8583, 21.3069],  // Honolulu, HI
    [-93.6091, 41.5868],   // Des Moines, IA
    [-92.2896, 34.7465],   // Little Rock, AR
    [-90.1848, 32.2988],   // Jackson, MS
    [-81.6326, 38.3498],   // Charleston, WV
    [-70.2568, 43.6591],   // Portland, ME
    [-73.2121, 44.4759],   // Burlington, VT
    [-71.4548, 42.9956],   // Manchester, NH
    [-71.4128, 41.8240],   // Providence, RI
    [-72.6851, 41.7637],   // Hartford, CT
    [-74.1724, 40.7357],   // Newark, NJ
    [-78.8784, 42.8864],   // Buffalo, NY
    [-117.4260, 47.6588],  // Spokane, WA
    [-108.5007, 45.7833],  // Billings, MT
    [-96.7898, 46.8772],   // Fargo, ND
    [-96.7311, 43.5460],   // Sioux Falls, SD
    [-97.3301, 37.6872],   // Wichita, KS
    [-95.9928, 36.1540],   // Tulsa, OK
    [-97.5164, 35.4676],   // Oklahoma City, OK
    [-91.1403, 30.4515],   // Baton Rouge, LA
    [-86.8025, 33.5207],   // Birmingham, AL
    [-81.0998, 32.0809],   // Savannah, GA
    [-77.4360, 37.5407],   // Richmond, VA
    [-76.2859, 36.8508],   // Norfolk, VA
    [-73.7562, 42.6526],   // Albany, NY
    [-76.1474, 43.0481],   // Syracuse, NY
    [-76.8867, 40.2732],   // Harrisburg, PA
    [-75.5466, 39.7391],   // Wilmington, DE
    [-75.5244, 39.1582],   // Dover, DE
    [-76.4922, 38.9784],   // Annapolis, MD
    [-74.7429, 40.2171],   // Trenton, NJ
    [-89.6501, 39.7817],   // Springfield, IL
    [-95.6890, 39.0473],   // Topeka, KS
    [-96.6852, 40.8136],   // Lincoln, NE
    [-104.8202, 41.1400],  // Cheyenne, WY
    [-112.0391, 46.5884],  // Helena, MT
    [-100.7837, 46.8083],  // Bismarck, ND
    [-100.3510, 44.3683],  // Pierre, SD
    [-103.2310, 44.0805],  // Rapid City, SD
    [-106.3131, 42.8666],  // Casper, WY
    [-108.5506, 39.0639],  // Grand Junction, CO
    [-111.6513, 35.1983],  // Flagstaff, AZ
    [-106.4850, 31.7619],  // El Paso, TX
    [-97.3964, 27.8006],   // Corpus Christi, TX
    [-88.0399, 30.6954],   // Mobile, AL
    [-87.2169, 30.4213],   // Pensacola, FL
    [-84.2807, 30.4383],   // Tallahassee, FL
    [-81.3792, 28.5383],   // Orlando, FL
    [-82.4572, 27.9506],   // Tampa, FL
    [-80.1373, 26.1224],   // Fort Lauderdale, FL
    [-83.9207, 35.9606],   // Knoxville, TN
    [-84.5037, 38.0406],   // Lexington, KY
    [-84.1916, 39.7589],   // Dayton, OH
    [-83.5379, 41.6528],   // Toledo, OH
    [-85.6681, 42.9634],   // Grand Rapids, MI
    [-88.0198, 44.5133],   // Green Bay, WI
    [-92.1005, 46.7867],   // Duluth, MN
    [-119.8138, 39.5296],  // Reno, NV
    [-119.0187, 35.3733],  // Bakersfield, CA
    [-118.1937, 33.7701],  // Long Beach, CA
    [-122.2712, 37.8044],  // Oakland, CA
    [-123.0868, 44.0521]   // Eugene, OR
];

function getRandomUSCoordinate() {
    const p = US_LAND_POINTS[Math.floor(Math.random() * US_LAND_POINTS.length)];
    return {
        coordinates: [p[0], p[1]],
        region: 'United States',
        isEdge: false
    };
}

// Dummy topic content generator with jurisdiction support
function getDummyMapTopics(jurisdiction = 'national') {
    const topicsByJurisdiction = {
        national: [
            "Infrastructure bill passes with bipartisan support",
            "Supreme Court decision impacts voting rights nationwide",
            "Federal healthcare legislation advances in Senate",
            "Veterans healthcare expansion approved",
            "National climate action plan announced",
            "Border security funding debate continues",
            "Federal minimum wage discussion heats up",
            "Military spending bill passes Congress",
            "National education reform proposed",
            "Immigration policy changes debated"
        ],
        state: [
            "State legislature debates education funding",
            "Governor signs new environmental protection act",
            "State budget includes infrastructure improvements",
            "Healthcare costs debate intensifies statewide",
            "Police reform measures gain momentum in capitol",
            "State university tuition freeze approved",
            "Economic development zones announced",
            "State park funding restored",
            "Transportation improvements funded",
            "Housing affordability crisis addressed"
        ],
        local: [
            "City council meeting scheduled tonight",
            "Local schools receive federal funding boost",
            "Community rallies for climate action",
            "Small business grants now available",
            "Neighborhood watch program expands",
            "Public library hours extended",
            "Local election candidate forums announced",
            "Road construction begins next month",
            "Voter registration drive succeeds",
            "Community center renovation approved"
        ]
    };

    const topics = topicsByJurisdiction[jurisdiction] || topicsByJurisdiction.national;

    // Shuffle and return with coordinates
    return topics
        .sort(() => Math.random() - 0.5)
        .map((text, index) => {
            const coordData = getRandomUSCoordinate();
            return {
                id: `dummy-${jurisdiction}-${index}-${Date.now()}`,
                text: text,
                coordinates: coordData.coordinates,
                region: coordData.region,
                isEdge: coordData.isEdge,
                engagement: Math.floor(Math.random() * 500) + 50,
                timestamp: `${Math.floor(Math.random() * 12) + 1} hours ago`,
                jurisdiction: jurisdiction
            };
        });
}

// Check if dummy data should be used
function shouldUseDummyData() {
    // Can be controlled via global flag
    if (window.MAP_USE_DUMMY_DATA === false) {
        return false;
    }

    // Or check if we have real data available
    // This would be replaced with actual API check
    const hasRealData = window.mapRealDataAvailable || false;

    return !hasRealData;
}

// ES6 Module Exports
export { shouldUseDummyData, getDummyMapTopics, getRandomUSCoordinate };

// Maintain backward compatibility - export as window.mapDummyData object
if (typeof window !== 'undefined') {
    window.mapDummyData = {
        shouldUseDummyData,
        getTopics: getDummyMapTopics,
        getRandomCoordinate: getRandomUSCoordinate
    };
}

// Log status
if (typeof adminDebugLog !== 'undefined') {
    adminDebugLog('MapDummyData', 'Dummy data system loaded', {
        enabled: shouldUseDummyData()
    });
}