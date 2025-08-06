// Test script for Geocodio API
require('dotenv').config();

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;
const GEOCODIO_BASE_URL = 'https://api.geocod.io/v1.7';

async function testGeocodioAPI() {
    if (!GEOCODIO_API_KEY) {
        console.error('❌ GEOCODIO_API_KEY not found in environment variables');
        console.log('📝 Sign up for free at: https://www.geocod.io/');
        console.log('📝 Add GEOCODIO_API_KEY=your_key_here to your .env file');
        return;
    }

    console.log('🔑 Geocodio API Key found:', GEOCODIO_API_KEY.substring(0, 10) + '...');
    
    // Test with a known address (Springfield, IL - state capital)
    const testAddress = '62701, IL'; // Springfield, IL zip code
    
    const url = `${GEOCODIO_BASE_URL}/geocode`;
    const params = new URLSearchParams({
        api_key: GEOCODIO_API_KEY,
        q: testAddress,
        fields: 'cd,stateleg,school' // Congressional, state legislative, and school districts
    });

    console.log('📍 Testing address:', testAddress);
    console.log('🌐 Request URL:', `${url}?${params}`);
    
    try {
        const response = await fetch(`${url}?${params}`);
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            return;
        }

        const data = await response.json();
        
        console.log('\n🎯 Raw Geocodio API Response:');
        console.log('=====================================');
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n📋 Response Structure Analysis:');
        console.log('- Results found:', data.results?.length || 0);
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            console.log('- Has congressional district data:', !!result.fields?.congressional_districts);
            console.log('- Has state legislative data:', !!result.fields?.state_legislative_districts);
            console.log('- Has school district data:', !!result.fields?.school_districts);
            console.log('- Coordinates:', result.location);
            console.log('- Formatted address:', result.formatted_address);
            
            // Congressional Districts (Federal)
            if (result.fields?.congressional_districts) {
                const cd = result.fields.congressional_districts[0];
                console.log('\n🏛️ Congressional District Info:');
                console.log('- District:', cd.district_number);
                console.log('- State:', cd.state_abbreviation);
                
                if (cd.current_legislators) {
                    console.log('\n👥 Federal Representatives:');
                    cd.current_legislators.forEach((leg, i) => {
                        console.log(`  ${i + 1}. ${leg.bio?.first_name} ${leg.bio?.last_name} (${leg.type}) - ${leg.bio?.party}`);
                    });
                }
            }
            
            // State Legislative Districts
            if (result.fields?.state_legislative_districts) {
                console.log('\n🏛️ State Legislative Districts:');
                
                // Handle house districts
                if (result.fields.state_legislative_districts.house) {
                    console.log('  House Districts:');
                    result.fields.state_legislative_districts.house.forEach((district, i) => {
                        console.log(`    ${district.name}`);
                        if (district.current_legislators) {
                            district.current_legislators.forEach((leg, j) => {
                                console.log(`      ${j + 1}. ${leg.bio?.first_name} ${leg.bio?.last_name} (${leg.type}) - ${leg.bio?.party}`);
                            });
                        }
                    });
                }
                
                // Handle senate districts
                if (result.fields.state_legislative_districts.senate) {
                    console.log('  Senate Districts:');
                    result.fields.state_legislative_districts.senate.forEach((district, i) => {
                        console.log(`    ${district.name}`);
                        if (district.current_legislators) {
                            district.current_legislators.forEach((leg, j) => {
                                console.log(`      ${j + 1}. ${leg.bio?.first_name} ${leg.bio?.last_name} (${leg.type}) - ${leg.bio?.party}`);
                            });
                        }
                    });
                }
            }
            
            // School Districts
            if (result.fields?.school_districts) {
                console.log('\n🎓 School Districts:');
                
                // Handle unified districts
                if (result.fields.school_districts.unified) {
                    const district = result.fields.school_districts.unified;
                    console.log(`  ${district.name} (${district.grade_low}-${district.grade_high})`);
                    console.log(`    LEA Code: ${district.lea_code}`);
                    
                    // Note: School districts typically don't have individual board member data in Geocodio
                    console.log('    Note: School board member data not available via Geocodio API');
                }
                
                // Handle elementary/secondary if present
                if (result.fields.school_districts.elementary) {
                    result.fields.school_districts.elementary.forEach((district, i) => {
                        console.log(`  Elementary: ${district.name} (${district.grade_low}-${district.grade_high})`);
                    });
                }
                
                if (result.fields.school_districts.secondary) {
                    result.fields.school_districts.secondary.forEach((district, i) => {
                        console.log(`  Secondary: ${district.name} (${district.grade_low}-${district.grade_high})`);
                    });
                }
            }
        }
        
    } catch (error) {
        console.error('💥 Request failed:', error.message);
    }
}

testGeocodioAPI();