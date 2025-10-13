/**
 * Map Dummy Data Fallback System
 * Provides fallback content when real posts are not available
 * TO DISABLE: Set window.MAP_USE_DUMMY_DATA = false or remove script import
 */

// Simple US coordinate generation
function getRandomUSCoordinate() {
    // Continental US bounds
    const bounds = {
        north: 49.0,
        south: 25.0,
        east: -66.0,
        west: -125.0
    };

    // Generate random coordinates within continental US
    // Latitude: 25 to 49 (south to north)
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);

    // Longitude: -125 to -66 (west to east, both negative)
    // Since west (-125) is less than east (-66), we calculate properly
    const lng = bounds.west + Math.random() * (bounds.east - bounds.west);

    // Weighted chance for Alaska/Hawaii placement at edges
    const chance = Math.random();
    if (chance < 0.05) {
        // 5% chance for Alaska (place at northwest edge)
        return {
            coordinates: [bounds.west + 0.5, bounds.north - 0.5],
            region: 'Alaska (off-map)',
            isEdge: true
        };
    } else if (chance < 0.1) {
        // 5% chance for Hawaii (place at southwest edge)
        return {
            coordinates: [bounds.west + 0.5, bounds.south + 0.5],
            region: 'Hawaii (off-map)',
            isEdge: true
        };
    }

    // 90% chance for continental US
    return {
        coordinates: [lng, lat],
        region: 'Continental US',
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

// Export for map system
window.mapDummyData = {
    shouldUseDummyData,
    getTopics: getDummyMapTopics,
    getRandomCoordinate: getRandomUSCoordinate
};

// Log status
if (typeof adminDebugLog !== 'undefined') {
    adminDebugLog('MapDummyData', 'Dummy data system loaded', {
        enabled: shouldUseDummyData()
    });
}