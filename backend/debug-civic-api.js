// Debug script to test Google Civic API response format
require('dotenv').config();

const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;
const GOOGLE_CIVIC_BASE_URL = 'https://www.googleapis.com/civicinfo/v2';

async function testGoogleCivicAPI() {
    if (!GOOGLE_CIVIC_API_KEY) {
        console.error('❌ GOOGLE_CIVIC_API_KEY not found in environment variables');
        return;
    }

    console.log('🔑 API Key found:', GOOGLE_CIVIC_API_KEY.substring(0, 10) + '...');
    
    // Test with a known address (Springfield, IL - state capital)
    const testAddress = '62701, IL'; // Springfield, IL zip code
    
    const url = `${GOOGLE_CIVIC_BASE_URL}/representatives`;
    const params = new URLSearchParams({
        key: GOOGLE_CIVIC_API_KEY,
        address: testAddress,
        includeOffices: 'true',
    });

    console.log('📍 Testing address:', testAddress);
    console.log('🌐 Request URL:', `${url}?${params}`);
    
    try {
        const response = await fetch(`${url}?${params}`);
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            return;
        }

        const data = await response.json();
        
        console.log('\n🎯 Raw Google Civic API Response:');
        console.log('=====================================');
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n📋 Response Structure Analysis:');
        console.log('- Has officials:', !!data.officials, data.officials?.length || 0);
        console.log('- Has offices:', !!data.offices, data.offices?.length || 0);
        console.log('- Has normalizedInput:', !!data.normalizedInput);
        
        if (data.officials && data.officials.length > 0) {
            console.log('\n👤 First Official Sample:');
            console.log(JSON.stringify(data.officials[0], null, 2));
        }
        
        if (data.offices && data.offices.length > 0) {
            console.log('\n🏢 First Office Sample:');
            console.log(JSON.stringify(data.offices[0], null, 2));
        }
        
    } catch (error) {
        console.error('💥 Request failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testGoogleCivicAPI();