// Google Maps Address Autocomplete Integration
let autocompleteInstances = {};

// Suppress Google Maps CSP test errors (cosmetic only, doesn't affect functionality)
(function suppressGoogleCSPErrors() {
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        // Filter out Google Maps CSP test 500 errors
        if (message.includes('gen_204?csp_test=true') || 
            message.includes('csp_test=true') ||
            (message.includes('500') && message.includes('maps.googleapis.com'))) {
            // Silently ignore Google's internal CSP test errors
            return;
        }
        // Allow all other errors through
        originalConsoleError.apply(console, args);
    };
})();

// Initialize Google Maps (called by API script)
function initGoogleMaps() {
    console.log('Google Maps API loaded successfully');
    
    // Registration form no longer includes address field
    
    // Initialize autocomplete for other forms as needed
    initAutocompleteForRepresentativeLookup();
}

// Generic autocomplete initialization
function initAutocomplete(inputId, instanceName) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.log(`Input field ${inputId} not found, will retry when needed`);
        return;
    }

    // Create autocomplete instance
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'address_components', 'geometry']
    });

    // Store instance for later reference
    autocompleteInstances[instanceName] = autocomplete;

    // Add listener for place selection
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place.geometry) {
            console.error('No details available for input: ' + place.name);
            return;
        }

        // Process the selected address
        processSelectedAddress(place, inputId);
    });

    console.log(`Autocomplete initialized for ${inputId}`);
}

// Process selected address and extract components
function processSelectedAddress(place, inputId) {
    const addressData = {
        formatted_address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        components: {}
    };

    // Extract address components
    place.address_components.forEach(component => {
        const types = component.types;
        
        if (types.includes('street_number')) {
            addressData.components.street_number = component.long_name;
        }
        if (types.includes('route')) {
            addressData.components.street = component.long_name;
        }
        if (types.includes('locality')) {
            addressData.components.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
            addressData.components.state = component.short_name;
            addressData.components.state_full = component.long_name;
        }
        if (types.includes('postal_code')) {
            addressData.components.zip = component.long_name;
        }
        if (types.includes('country')) {
            addressData.components.country = component.short_name;
        }
    });

    // Build clean address string
    if (addressData.components.street_number && addressData.components.street) {
        addressData.components.street_address = 
            `${addressData.components.street_number} ${addressData.components.street}`;
    }

    // Store the data in hidden field if it exists
    const dataField = document.getElementById(inputId + 'Data');
    if (dataField) {
        dataField.value = JSON.stringify(addressData);
    }

    // Store in window for easy access
    window.lastSelectedAddress = addressData;
    
    console.log('Address selected:', addressData);

    // Trigger custom event for other systems to react
    window.dispatchEvent(new CustomEvent('addressSelected', { 
        detail: { addressData, inputId } 
    }));
}

// Initialize autocomplete for representative lookup
function initAutocompleteForRepresentativeLookup() {
    // Check if officials panel has an address input
    const officialsContent = document.getElementById('officialsContent');
    if (!officialsContent) return;

    // Works for both logged-in and anonymous users

    // Add address input to officials panel if not present
    if (!document.getElementById('lookupAddress')) {
        const isLoggedIn = localStorage.getItem('token');
        const loginPrompt = isLoggedIn ? '' : 
            '<p style="color: #666; font-size: 0.9em; margin-bottom: 1rem;">💡 <a href="#" onclick="typeof openAuthModal !== \'undefined\' ? openAuthModal() : alert(\'Please sign up to save your address!\')">Sign up</a> to save your address and get personalized updates!</p>';
        
        const addressHTML = `
            ${loginPrompt}
            <div class="address-lookup-container" style="margin-bottom: 1rem;">
                <label for="lookupAddress" style="display: block; margin-bottom: 0.5rem;">
                    Enter any address to find representatives:
                </label>
                <input type="text" id="lookupAddress" 
                       placeholder="Start typing an address..." 
                       style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn" onclick="lookupRepresentatives()" 
                        style="margin-top: 0.5rem; width: 100%;">
                    Find Representatives
                </button>
            </div>
            <div id="representativesResults"></div>
        `;
        
        officialsContent.innerHTML = addressHTML;
        
        // Initialize autocomplete for this new input
        setTimeout(() => {
            initAutocomplete('lookupAddress', 'lookup');
        }, 100);
    }
}

// Lookup representatives using the selected address
async function lookupRepresentatives() {
    const addressData = window.lastSelectedAddress;
    if (!addressData) {
        alert('Please select an address from the dropdown first');
        return;
    }

    const resultsDiv = document.getElementById('representativesResults');
    resultsDiv.innerHTML = '<p>Loading representatives...</p>';

    try {
        const token = localStorage.getItem('token');
        
        // If user is logged in, offer to save address to profile
        if (token && confirm('Would you like to save this address to your profile?')) {
            try {
                await fetch(`${getApiBase()}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        address: addressData.formatted_address,
                        city: addressData.components.city,
                        state: addressData.components.state,
                        zipCode: addressData.components.zip
                    })
                });
            } catch (error) {
                console.log('Failed to save address to profile:', error);
                // Continue with lookup even if profile update fails
            }
        }

        // Use public endpoint for representative lookup (works for anonymous users)
        const params = new URLSearchParams({
            address: addressData.formatted_address,
            forceRefresh: 'false'
        });
        
        const response = await fetch(`${getApiBase()}/political/representatives/lookup?${params}`);

        if (!response.ok) {
            throw new Error('Failed to fetch representatives');
        }

        const data = await response.json();
        displayRepresentatives(data);
        
    } catch (error) {
        console.error('Error fetching representatives:', error);
        resultsDiv.innerHTML = '<p style="color: red;">Error loading representatives. Please try again.</p>';
    }
}

// Display representatives in the panel
function displayRepresentatives(data) {
    const resultsDiv = document.getElementById('representativesResults');
    
    if (!data.representatives || Object.keys(data.representatives).length === 0) {
        resultsDiv.innerHTML = '<p>No representatives found for this address.</p>';
        return;
    }

    let html = '<div class="representatives-list">';
    
    // Federal representatives
    if (data.representatives.federal && data.representatives.federal.length > 0) {
        html += '<h4>Federal Representatives</h4>';
        data.representatives.federal.forEach(rep => {
            html += createRepresentativeCard(rep);
        });
    }

    // State representatives
    if (data.representatives.state && data.representatives.state.length > 0) {
        html += '<h4>State Representatives</h4>';
        data.representatives.state.forEach(rep => {
            html += createRepresentativeCard(rep);
        });
    }

    // Local representatives
    if (data.representatives.local && data.representatives.local.length > 0) {
        html += '<h4>Local Representatives</h4>';
        data.representatives.local.forEach(rep => {
            html += createRepresentativeCard(rep);
        });
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Create HTML card for a representative
function createRepresentativeCard(rep) {
    let html = `
        <div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 4px;">
            <strong>${rep.name}</strong><br>
            <em>${rep.office}</em>
    `;
    
    if (rep.party) {
        html += `<br>Party: ${rep.party}`;
    }
    
    if (rep.phones && rep.phones.length > 0) {
        html += `<br>Phone: ${rep.phones[0]}`;
    }
    
    if (rep.emails && rep.emails.length > 0) {
        html += `<br>Email: ${rep.emails[0]}`;
    }
    
    if (rep.urls && rep.urls.length > 0) {
        html += `<br><a href="${rep.urls[0]}" target="_blank">Website</a>`;
    }
    
    html += '</div>';
    return html;
}

// Re-initialize autocomplete when auth modal is shown (address field removed from registration)
window.addEventListener('authModalOpened', () => {
    // No address field in registration form anymore
    console.log('Auth modal opened - address field removed from registration');
});

// Re-initialize when officials panel is opened
window.addEventListener('panelOpened', (event) => {
    if (event.detail && event.detail.panelName === 'officials') {
        setTimeout(() => {
            if (window.google && window.google.maps) {
                initAutocompleteForRepresentativeLookup();
            }
        }, 100);
    }
});

// Helper function to get API base URL (matches main app logic)
function getApiBase() {
    return (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.protocol === 'file:')
        ? 'http://localhost:3001/api' 
        : 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io/api';
}

// Make functions available globally
window.initGoogleMaps = initGoogleMaps;
window.lookupRepresentatives = lookupRepresentatives;
window.initAutocompleteForRepresentativeLookup = initAutocompleteForRepresentativeLookup;

console.log('Google Address Autocomplete module loaded');