// Quick Stripe API Test Script
// Run with: node test-stripe.js

const API_BASE = 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';

// You'll need a valid auth token from logging into the app
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWUzam40ajkwMDAwemMwNnY5ZmRuMjZoIiwiaWF0IjoxNzU1NTQxNTkxLCJleHAiOjE3NTYxNDYzOTF9.Dy2DNzyFKYnHKzFALEv_41YaRAyod5w4Opnsn43ZkH8';

async function testStripeIntegration() {
    console.log('🧪 Testing Stripe Integration...\n');

    // Test 1: Check if campaigns endpoint works
    try {
        console.log('1️⃣ Testing campaigns endpoint...');
        const response = await fetch(`${API_BASE}/payments/campaigns`);
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Campaigns endpoint working:', data);
        } else {
            console.log('❌ Campaigns endpoint failed');
        }
    } catch (error) {
        console.log('❌ Campaigns test error:', error.message);
    }

    console.log('\n');

    // Test 2: Try creating a test donation (requires auth)
    if (AUTH_TOKEN !== 'YOUR_AUTH_TOKEN_HERE') {
        try {
            console.log('2️⃣ Testing donation creation...');
            const response = await fetch(`${API_BASE}/payments/donation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                },
                body: JSON.stringify({
                    amount: 2500, // $25.00 in cents
                    donationType: 'ONE_TIME',
                    isRecurring: false
                })
            });
            
            console.log(`Status: ${response.status}`);
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Donation endpoint working!');
                console.log('💳 Checkout URL:', data.data.checkoutUrl);
                console.log('📄 Payment ID:', data.data.paymentId);
            } else {
                console.log('❌ Donation failed:', data);
            }
        } catch (error) {
            console.log('❌ Donation test error:', error.message);
        }
    } else {
        console.log('2️⃣ Skipping donation test - need auth token');
        console.log('   💡 Log into the app and get token from localStorage.getItem("authToken")');
    }

    console.log('\n');

    // Test 3: Test fee payment (candidate registration)
    if (AUTH_TOKEN !== 'YOUR_AUTH_TOKEN_HERE') {
        try {
            console.log('3️⃣ Testing fee payment...');
            const response = await fetch(`${API_BASE}/payments/fee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                },
                body: JSON.stringify({
                    amount: 5000, // $50.00 candidate registration fee
                    feeType: 'CANDIDATE_REGISTRATION',
                    description: 'Test candidate registration fee'
                })
            });
            
            console.log(`Status: ${response.status}`);
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Fee payment endpoint working!');
                console.log('💳 Checkout URL:', data.data.checkoutUrl);
                console.log('📄 Payment ID:', data.data.paymentId);
            } else {
                console.log('❌ Fee payment failed:', data);
            }
        } catch (error) {
            console.log('❌ Fee test error:', error.message);
        }
    } else {
        console.log('3️⃣ Skipping fee test - need auth token');
    }

    console.log('\n🏁 Test complete!');
}

testStripeIntegration();