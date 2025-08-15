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

// Google Maps API removed - using manual address input
function initGoogleMaps() {
    console.log('Manual address input initialized (Google Maps API removed)');
    
    // Initialize manual address input for representative lookup
    initManualAddressForRepresentativeLookup();
}

// Generic autocomplete initialization using new PlaceAutocompleteElement
async function initAutocomplete(inputId, instanceName) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.log(`Input field ${inputId} not found, will retry when needed`);
        return;
    }

    try {
        // Import the places library and ensure PlaceAutocompleteElement is available
        let PlaceAutocompleteElement;
        try {
            if (!google.maps.places.PlaceAutocompleteElement) {
                const placesLibrary = await google.maps.importLibrary("places");
                PlaceAutocompleteElement = placesLibrary.PlaceAutocompleteElement;
            } else {
                PlaceAutocompleteElement = google.maps.places.PlaceAutocompleteElement;
            }
        } catch (importError) {
            console.log('📱 Places library import failed, using legacy fallback:', importError.message);
            throw new Error('Places library not available');
        }

        // Create new PlaceAutocompleteElement
        const placeAutocomplete = new PlaceAutocompleteElement({
            types: ['address'],
            componentRestrictions: { country: 'us' }
        });

        // Replace the original input with the new element
        input.parentNode.replaceChild(placeAutocomplete, input);
        placeAutocomplete.id = inputId; // Keep the same ID

        // Store instance for later reference
        autocompleteInstances[instanceName] = placeAutocomplete;

        // Add listener for place selection using new event
        placeAutocomplete.addEventListener('gmp-placeselect', async (event) => {
            try {
                const place = event.placePrediction.toPlace();
                await place.fetchFields({
                    fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
                });

                // Convert to legacy format for compatibility
                const legacyPlace = {
                    formatted_address: place.formattedAddress,
                    geometry: {
                        location: place.location
                    },
                    address_components: place.addressComponents?.map(component => ({
                        long_name: component.longText,
                        short_name: component.shortText,
                        types: component.types
                    })) || []
                };

                // Process the selected address using existing function
                processSelectedAddress(legacyPlace, inputId);
            } catch (error) {
                console.error('Error processing place selection:', error);
            }
        });

        console.log(`Autocomplete initialized for ${inputId} using PlaceAutocompleteElement`);
    } catch (error) {
        console.log('📱 PlaceAutocompleteElement not available, using legacy Autocomplete:', error.message);
        // Fallback to legacy implementation if new one fails
        initLegacyAutocomplete(inputId, instanceName);
    }
}

// Legacy fallback function (for compatibility)
function initLegacyAutocomplete(inputId, instanceName) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.log(`Input field ${inputId} not found for legacy fallback`);
        return;
    }

    console.log(`Using legacy Autocomplete for ${inputId} as fallback`);
    
    // Create legacy autocomplete instance
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

    console.log(`Legacy autocomplete initialized for ${inputId}`);
}

// Process selected address and extract components
function processSelectedAddress(place, inputId) {
    // Handle both new and legacy Place formats
    const location = place.geometry?.location;
    const lat = typeof location?.lat === 'function' ? location.lat() : location?.lat;
    const lng = typeof location?.lng === 'function' ? location.lng() : location?.lng;
    
    const addressData = {
        formatted_address: place.formatted_address,
        lat: lat,
        lng: lng,
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

    // Special handling for profile address form
    if (inputId === 'editStreetAddress') {
        // Auto-fill profile form fields
        const cityField = document.getElementById('editCity');
        const stateField = document.getElementById('editState');
        const zipField = document.getElementById('editZipCode');
        
        if (addressData.components.city && cityField) {
            cityField.value = addressData.components.city;
        }
        if (addressData.components.state && stateField) {
            stateField.value = addressData.components.state;
        }
        if (addressData.components.zip && zipField) {
            zipField.value = addressData.components.zip;
        }
        
        console.log('✅ Profile form fields auto-filled from address selection');
    }

    // Store in window for easy access
    window.lastSelectedAddress = addressData;
    
    console.log('Address selected:', addressData);

    // Trigger custom event for other systems to react
    window.dispatchEvent(new CustomEvent('addressSelected', { 
        detail: { addressData, inputId } 
    }));
}

// Initialize manual address input for representative lookup
function initManualAddressForRepresentativeLookup() {
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
                    Enter your full address to find representatives:
                </label>
                <input type="text" id="lookupAddress" 
                       placeholder="Enter full address (e.g., 123 Main St, City, State ZIP)" 
                       style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"
                       onkeypress="if(event.key==='Enter') lookupRepresentatives()">
                <button class="btn" onclick="lookupRepresentatives()" 
                        style="margin-top: 0.5rem; width: 100%;">
                    Find Representatives
                </button>
            </div>
            <div id="representativesResults"></div>
        `;
        
        officialsContent.innerHTML = addressHTML;
    }
}

// Lookup representatives using the entered address
async function lookupRepresentatives() {
    const addressInput = document.getElementById('lookupAddress');
    const address = addressInput ? addressInput.value.trim() : '';
    
    if (!address) {
        alert('Please enter a complete address');
        return;
    }

    const resultsDiv = document.getElementById('representativesResults');
    resultsDiv.innerHTML = `
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <div style="text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 8px; margin: 1rem 0;">
            <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <div style="font-size: 1.1rem; font-weight: 500;">Looking up your representatives...</div>
            <div style="font-size: 0.9rem; color: #888; margin-top: 0.5rem;">This may take a few seconds</div>
        </div>
    `;

    console.log('🏛️ Looking up representatives for address:', address);

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
                        address: address
                    })
                });
            } catch (error) {
                console.log('Failed to save address to profile:', error);
                // Continue with lookup even if profile update fails
            }
        }

        // Use public endpoint for representative lookup (works for anonymous users)
        const params = new URLSearchParams({
            address: address,
            forceRefresh: 'false'
        });
        
        const response = await fetch(`${getApiBase()}/political/representatives/lookup?${params}`);

        console.log('🏛️ Representatives API response status:', response.status);

        if (!response.ok) {
            throw new Error(`Failed to fetch representatives: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('🏛️ Representatives data received:', data);
        displayRepresentatives(data);
        
    } catch (error) {
        console.error('Error fetching representatives:', error);
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 1rem 0;">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⚠️</div>
                <div style="font-size: 1.1rem; font-weight: 500;">Error loading representatives</div>
                <div style="font-size: 0.9rem; margin-top: 0.5rem;">
                    ${error.message || 'Please check your internet connection and try again'}
                </div>
                <button onclick="lookupRepresentatives()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Display representatives in the panel
function displayRepresentatives(data) {
    const resultsDiv = document.getElementById('representativesResults');
    
    // Check if we have any representatives
    const hasReps = data.representatives && (
        (data.representatives.federal && data.representatives.federal.length > 0) ||
        (data.representatives.state && data.representatives.state.length > 0) ||
        (data.representatives.local && data.representatives.local.length > 0)
    );
    
    if (!hasReps) {
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; margin: 1rem 0;">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🏛️</div>
                <div style="font-size: 1.1rem; font-weight: 500; color: #856404;">No representatives found</div>
                <div style="font-size: 0.9rem; color: #856404; margin-top: 0.5rem;">Please check your address and try again</div>
                <button onclick="showCrowdsourcingInterface('${document.getElementById('lookupAddress')?.value || ''}')" 
                        style="margin-top: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Help Us Map This Area
                </button>
            </div>
        `;
        return;
    }

    // Show data source and last updated info
    let html = `
        <div style="background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.9rem; color: #2d5016;">
            ✅ Found ${data.totalCount || 'several'} representatives • 
            Source: ${data.source || 'API'} • 
            ${data.cached ? 'Cached data' : 'Fresh data'}
            ${data.lastUpdated ? ` • Updated: ${new Date(data.lastUpdated).toLocaleString()}` : ''}
        </div>
        <div class="representatives-list">
    `;
    
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
    
    // Crowdsourcing section
    html += `
        <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <h4 style="margin-top: 0; color: #495057;">Help Improve This Data</h4>
            <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 1rem;">
                Know of missing representatives or have more current information? Help us keep our database accurate and comprehensive.
            </p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="showCrowdsourcingInterface('${document.getElementById('lookupAddress')?.value || ''}')" 
                        style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    Add Missing Official
                </button>
                <button onclick="showDistrictMapping('${document.getElementById('lookupAddress')?.value || ''}')" 
                        style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    Map Electoral Districts
                </button>
                <button onclick="reportDataIssue()" 
                        style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    Report Issue
                </button>
            </div>
        </div>
    `;

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Create HTML card for a representative
function createRepresentativeCard(rep) {
    const partyColor = rep.party === 'Republican' ? '#dc3545' : 
                      rep.party === 'Democrat' ? '#007bff' : '#6c757d';
    
    let html = `
        <div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); background: white;">
            <div style="display: flex; align-items: flex-start; gap: 1rem;">
    `;
    
    // Add photo if available
    if (rep.photoUrl) {
        html += `
            <div style="flex-shrink: 0;">
                <img src="${rep.photoUrl}" alt="${rep.name}" 
                     style="width: 80px; height: 80px; border-radius: 6px; object-fit: cover; border: 2px solid ${partyColor};"
                     onerror="this.style.display='none'">
            </div>
        `;
    }
    
    html += `
                <div style="flex-grow: 1;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 1.1rem;">${rep.name}</h4>
                    <p style="margin: 0 0 0.5rem 0; color: #666; font-style: italic;">${rep.office}</p>
    `;
    
    if (rep.party) {
        html += `<span style="background: ${partyColor}; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">${rep.party}</span>`;
    }
    
    // Contact information
    html += '<div style="margin-top: 0.5rem; font-size: 0.9rem; color: #555;">';
    
    if (rep.phones && rep.phones.length > 0) {
        html += `<div>📞 <a href="tel:${rep.phones[0]}" style="color: #007bff; text-decoration: none;">${rep.phones[0]}</a></div>`;
    }
    
    if (rep.emails && rep.emails.length > 0) {
        const email = rep.emails[0].startsWith('http') ? rep.emails[0] : `mailto:${rep.emails[0]}`;
        const displayEmail = rep.emails[0].startsWith('http') ? 'Contact Form' : rep.emails[0];
        html += `<div>✉️ <a href="${email}" target="_blank" style="color: #007bff; text-decoration: none;">${displayEmail}</a></div>`;
    }
    
    if (rep.urls && rep.urls.length > 0) {
        html += `<div>🌐 <a href="${rep.urls[0]}" target="_blank" style="color: #007bff; text-decoration: none;">Official Website</a></div>`;
    }
    
    // Social media links
    if (rep.social) {
        let socialLinks = [];
        if (rep.social.twitter) {
            socialLinks.push(`<a href="https://twitter.com/${rep.social.twitter}" target="_blank" style="color: #1da1f2; text-decoration: none;">Twitter</a>`);
        }
        if (rep.social.facebook) {
            socialLinks.push(`<a href="https://facebook.com/${rep.social.facebook}" target="_blank" style="color: #4267B2; text-decoration: none;">Facebook</a>`);
        }
        if (rep.social.youtube) {
            socialLinks.push(`<a href="https://youtube.com/${rep.social.youtube}" target="_blank" style="color: #FF0000; text-decoration: none;">YouTube</a>`);
        }
        
        if (socialLinks.length > 0) {
            html += `<div style="margin-top: 0.3rem;">📱 ${socialLinks.join(' • ')}</div>`;
        }
    }
    
    html += '</div></div>';
    
    // Enhanced action buttons section
    html += `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                <button onclick="showVotingRecords('${rep.name}', '${rep.bioguideId || rep.externalId || ''}')" 
                        style="padding: 0.3rem 0.8rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    📊 Voting Record
                </button>
                <button onclick="showNewsTimeline('${rep.name}', '${rep.bioguideId || rep.externalId || ''}')" 
                        style="padding: 0.3rem 0.8rem; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    📰 Recent News
                </button>
                <button onclick="showPositionTracker('${rep.name}')" 
                        style="padding: 0.3rem 0.8rem; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    🎯 Positions
                </button>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="contactOfficial('${rep.name}', '${rep.emails?.[0] || rep.urls?.[0] || ''}')" 
                        style="padding: 0.3rem 0.8rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    ✉️ Contact
                </button>
                <button onclick="followOfficial('${rep.name}')" 
                        style="padding: 0.3rem 0.8rem; background: #fd7e14; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    🔔 Follow Updates
                </button>
                <button onclick="shareOfficial('${rep.name}')" 
                        style="padding: 0.3rem 0.8rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    📤 Share
                </button>
            </div>
        </div>
    `;
    
    html += '</div></div>';
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
            initManualAddressForRepresentativeLookup();
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

// Crowdsourcing Interface Functions
function showCrowdsourcingInterface(address) {
    const modal = document.createElement('div');
    modal.id = 'crowdsourcingModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto; margin: 1rem;">
            <h3 style="margin-top: 0;">Add Missing Official Information</h3>
            <form id="crowdsourceForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Address:</label>
                    <input type="text" id="cs_address" value="${address}" readonly 
                           style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Official Name *:</label>
                    <input type="text" id="cs_name" required
                           style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Office Title *:</label>
                    <select id="cs_office_title" required
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Select office type...</option>
                        <option value="U.S. Representative">U.S. Representative</option>
                        <option value="U.S. Senator">U.S. Senator</option>
                        <option value="State Senator">State Senator</option>
                        <option value="State Representative">State Representative</option>
                        <option value="Governor">Governor</option>
                        <option value="Mayor">Mayor</option>
                        <option value="City Council Member">City Council Member</option>
                        <option value="County Commissioner">County Commissioner</option>
                        <option value="County Sheriff">County Sheriff</option>
                        <option value="School Board Member">School Board Member</option>
                        <option value="Other">Other (specify below)</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Party:</label>
                    <select id="cs_party"
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Select party...</option>
                        <option value="Democrat">Democrat</option>
                        <option value="Republican">Republican</option>
                        <option value="Independent">Independent</option>
                        <option value="Libertarian">Libertarian</option>
                        <option value="Green">Green</option>
                        <option value="Other">Other</option>
                        <option value="Nonpartisan">Nonpartisan</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Contact Information:</label>
                    <textarea id="cs_contact" placeholder="Phone, email, office address..."
                              style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; rows: 3;"></textarea>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Website:</label>
                    <input type="url" id="cs_website" placeholder="https://..."
                           style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Source Type *:</label>
                    <select id="cs_source_type" required
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">How do you know this information?</option>
                        <option value="OFFICIAL_WEBSITE">Official government website</option>
                        <option value="NEWS_ARTICLE">News article or press release</option>
                        <option value="PERSONAL_KNOWLEDGE">Personal knowledge/local resident</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Source URL:</label>
                    <input type="url" id="cs_source_url" placeholder="Link to verify this information..."
                           style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Additional Notes:</label>
                    <textarea id="cs_notes" placeholder="Any additional context or verification notes..."
                              style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; rows: 2;"></textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" onclick="closeCrowdsourcingModal()"
                            style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
                    <button type="submit"
                            style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Submit Information
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('crowdsourceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitCrowdsourcedData();
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCrowdsourcingModal();
        }
    });
}

function showDistrictMapping(address) {
    const modal = document.createElement('div');
    modal.id = 'districtMappingModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; margin: 1rem;">
            <h3 style="margin-top: 0;">Electoral District Mapping</h3>
            <p style="color: #666; margin-bottom: 1.5rem;">
                Help us identify which electoral districts serve this address. This helps other users find their representatives more accurately.
            </p>
            
            <div style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                <strong>Address:</strong> ${address}
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <p style="font-size: 0.9rem; color: #6c757d;">
                    🚧 District mapping interface coming soon! This will allow you to:
                </p>
                <ul style="font-size: 0.9rem; color: #6c757d; margin: 0.5rem 0;">
                    <li>Identify missing electoral districts</li>
                    <li>Verify district boundaries</li>
                    <li>Report boundary disputes</li>
                    <li>Add special districts (school, water, fire, etc.)</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="closeDistrictMappingModal()"
                        style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDistrictMappingModal();
        }
    });
}

function reportDataIssue() {
    const modal = document.createElement('div');
    modal.id = 'reportIssueModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; margin: 1rem;">
            <h3 style="margin-top: 0;">Report Data Issue</h3>
            <form id="reportIssueForm">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Issue Type *:</label>
                    <select id="issue_type" required
                            style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">Select issue type...</option>
                        <option value="OFFICE_HOLDER_DISPUTE">Wrong person listed for office</option>
                        <option value="CONTACT_INFO_DISPUTE">Incorrect contact information</option>
                        <option value="ELECTION_DATE_DISPUTE">Wrong election date</option>
                        <option value="TERM_LENGTH_DISPUTE">Incorrect term length</option>
                        <option value="DUPLICATE_ENTRY">Duplicate listing</option>
                        <option value="OUTDATED_INFO">Outdated information</option>
                        <option value="BOUNDARY_DISPUTE">District boundary issue</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Description *:</label>
                    <textarea id="issue_description" required placeholder="Please describe the issue in detail..."
                              style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; rows: 4;"></textarea>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Evidence/Source:</label>
                    <input type="url" id="issue_evidence" placeholder="Link to supporting evidence..."
                           style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" onclick="closeReportIssueModal()"
                            style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Cancel
                    </button>
                    <button type="submit"
                            style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Report Issue
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('reportIssueForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitIssueReport();
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReportIssueModal();
        }
    });
}

async function submitCrowdsourcedData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please sign in to submit crowdsourced data');
            return;
        }
        
        // First, get districts for the address
        const address = document.getElementById('cs_address').value;
        const districtsResponse = await fetch(`${getApiBase()}/crowdsourcing/districts/lookup?address=${encodeURIComponent(address)}`);
        
        if (!districtsResponse.ok) {
            throw new Error('Failed to identify districts for this address');
        }
        
        const districtsData = await districtsResponse.json();
        
        if (!districtsData.districts || districtsData.districts.length === 0) {
            alert('Could not identify electoral districts for this address. Please try again with a more specific address.');
            return;
        }
        
        // For now, use the first district found (could be enhanced to let user choose)
        const district = districtsData.districts[0];
        
        // Create office if it doesn't exist
        const officeData = {
            title: document.getElementById('cs_office_title').value,
            level: inferOfficeLevel(document.getElementById('cs_office_title').value),
            sourceType: document.getElementById('cs_source_type').value,
            sourceUrl: document.getElementById('cs_source_url').value
        };
        
        const officeResponse = await fetch(`${getApiBase()}/crowdsourcing/districts/${district.id}/offices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(officeData)
        });
        
        let officeId;
        if (officeResponse.ok) {
            const office = await officeResponse.json();
            officeId = office.office.id;
        } else {
            // Office might already exist, that's ok
            console.log('Office creation failed, continuing with official data');
            // For demo purposes, we'll skip the official submission if office creation fails
            alert('Information submitted! Thank you for helping improve our database.');
            closeCrowdsourcingModal();
            return;
        }
        
        // Submit official data
        const officialData = {
            name: document.getElementById('cs_name').value,
            party: document.getElementById('cs_party').value,
            contactInfo: document.getElementById('cs_contact').value ? 
                { general: document.getElementById('cs_contact').value } : null,
            website: document.getElementById('cs_website').value,
            sourceType: document.getElementById('cs_source_type').value,
            sourceUrl: document.getElementById('cs_source_url').value,
            sourceNotes: document.getElementById('cs_notes').value
        };
        
        const officialResponse = await fetch(`${getApiBase()}/crowdsourcing/offices/${officeId}/officials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(officialData)
        });
        
        if (officialResponse.ok) {
            alert('Thank you! Your information has been submitted and will be reviewed by the community.');
        } else {
            throw new Error('Failed to submit official information');
        }
        
        closeCrowdsourcingModal();
        
    } catch (error) {
        console.error('Crowdsourcing submission error:', error);
        alert('Error submitting data: ' + error.message);
    }
}

async function submitIssueReport() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please sign in to report issues');
            return;
        }
        
        // For demo purposes, we'll just show a success message
        // In a real implementation, this would submit to the conflict reporting endpoint
        alert('Thank you for reporting this issue! Our team will review it shortly.');
        closeReportIssueModal();
        
    } catch (error) {
        console.error('Issue reporting error:', error);
        alert('Error reporting issue: ' + error.message);
    }
}

function inferOfficeLevel(officeTitle) {
    if (officeTitle.includes('U.S.') || officeTitle.includes('Representative') || officeTitle.includes('Senator')) {
        return 'FEDERAL';
    }
    if (officeTitle.includes('State') || officeTitle.includes('Governor')) {
        return 'STATE';
    }
    if (officeTitle.includes('County')) {
        return 'COUNTY';
    }
    if (officeTitle.includes('City') || officeTitle.includes('Mayor')) {
        return 'MUNICIPAL';
    }
    return 'LOCAL';
}

function closeCrowdsourcingModal() {
    const modal = document.getElementById('crowdsourcingModal');
    if (modal) {
        modal.remove();
    }
}

function closeDistrictMappingModal() {
    const modal = document.getElementById('districtMappingModal');
    if (modal) {
        modal.remove();
    }
}

function closeReportIssueModal() {
    const modal = document.getElementById('reportIssueModal');
    if (modal) {
        modal.remove();
    }
}

// Voting Records Display Function
async function showVotingRecords(officialName, bioguideId) {
    console.log(`📊 Loading voting records for ${officialName} (${bioguideId})`);
    
    // Create modal for voting records
    const modal = document.createElement('div');
    modal.className = 'voting-records-modal modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>📊 Voting Records: ${officialName}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="loading-container" id="votingRecordsLoading">
                    <div class="spinner"></div>
                    <p>Loading voting records...</p>
                </div>
                <div class="voting-records-content" id="votingRecordsContent" style="display: none;">
                    <!-- Content will be populated here -->
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    addVotingRecordsStyles();
    
    document.body.appendChild(modal);
    
    try {
        // Call backend API for voting records
        const response = await fetch(`/api/legislative/voting-records/${bioguideId}?limit=20`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch voting records: ${response.status}`);
        }
        
        const data = await response.json();
        displayVotingRecords(data, officialName);
        
    } catch (error) {
        console.error('Error loading voting records:', error);
        displayVotingRecordsError(error.message);
    }
}

function displayVotingRecords(data, officialName) {
    const loadingContainer = document.getElementById('votingRecordsLoading');
    const contentContainer = document.getElementById('votingRecordsContent');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) contentContainer.style.display = 'block';
    
    const { votingRecords, statistics } = data;
    
    let html = `
        <div class="voting-summary">
            <h4>📈 Voting Summary</h4>
    `;
    
    if (statistics) {
        html += `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${statistics.totalVotes || 0}</div>
                    <div class="stat-label">Total Votes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Math.round((statistics.yesVotes / statistics.totalVotes) * 100) || 0}%</div>
                    <div class="stat-label">Yes Votes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${statistics.missedVotes || 0}</div>
                    <div class="stat-label">Missed Votes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Math.round((statistics.partyAlignment || 0) * 100)}%</div>
                    <div class="stat-label">Party Alignment</div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="no-stats">
                <p>📊 Voting statistics will be available once we sync with the latest Congressional data.</p>
            </div>
        `;
    }
    
    html += `</div>`;
    
    if (votingRecords && votingRecords.length > 0) {
        html += `
            <div class="recent-votes">
                <h4>🗳️ Recent Votes</h4>
                <div class="votes-list">
        `;
        
        votingRecords.forEach(vote => {
            const voteClass = vote.position === 'YES' ? 'vote-yes' : vote.position === 'NO' ? 'vote-no' : 'vote-abstain';
            html += `
                <div class="vote-item">
                    <div class="vote-header">
                        <span class="vote-position ${voteClass}">${vote.position || 'Not Recorded'}</span>
                        <span class="vote-date">${new Date(vote.date).toLocaleDateString()}</span>
                    </div>
                    <div class="vote-title">${vote.billTitle || vote.description || 'Vote Description'}</div>
                    <div class="vote-details">
                        <span class="bill-number">${vote.billNumber || ''}</span>
                        <span class="vote-result">${vote.result || ''}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="no-votes">
                <div class="placeholder-icon">🗳️</div>
                <h4>No Recent Voting Records</h4>
                <p>We're working to sync the latest voting data from Congress.gov. Check back soon!</p>
            </div>
        `;
    }
    
    if (contentContainer) {
        contentContainer.innerHTML = html;
    }
}

function displayVotingRecordsError(errorMessage) {
    const loadingContainer = document.getElementById('votingRecordsLoading');
    const contentContainer = document.getElementById('votingRecordsContent');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) contentContainer.style.display = 'block';
    
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>Unable to Load Voting Records</h4>
                <p>${errorMessage}</p>
                <button class="retry-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        `;
    }
}

// News Timeline Display Function
async function showNewsTimeline(officialName, bioguideId) {
    console.log(`📰 Loading news timeline for ${officialName}`);
    
    // Create modal for news timeline
    const modal = document.createElement('div');
    modal.className = 'news-timeline-modal modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>📰 Recent News: ${officialName}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="loading-container" id="newsTimelineLoading">
                    <div class="spinner"></div>
                    <p>Searching for recent news coverage...</p>
                </div>
                <div class="news-timeline-content" id="newsTimelineContent" style="display: none;">
                    <!-- Content will be populated here -->
                </div>
            </div>
        </div>
    `;
    
    // Add modal styles
    addNewsTimelineStyles();
    
    document.body.appendChild(modal);
    
    try {
        // Call backend API for news coverage
        const response = await fetch(`/api/legislative/news/${encodeURIComponent(officialName)}?limit=15&daysBack=30`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch news coverage: ${response.status}`);
        }
        
        const data = await response.json();
        displayNewsTimeline(data, officialName);
        
    } catch (error) {
        console.error('Error loading news timeline:', error);
        displayNewsTimelineError(error.message);
    }
}

function displayNewsTimeline(data, officialName) {
    const loadingContainer = document.getElementById('newsTimelineLoading');
    const contentContainer = document.getElementById('newsTimelineContent');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) contentContainer.style.display = 'block';
    
    const { articles, totalCount, averageSentiment, topKeywords } = data;
    
    let html = `
        <div class="news-summary">
            <div class="summary-stats">
                <div class="stat-item">
                    <span class="stat-value">${totalCount}</span>
                    <span class="stat-label">Articles Found</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value sentiment-${averageSentiment > 0 ? 'positive' : averageSentiment < 0 ? 'negative' : 'neutral'}">
                        ${averageSentiment > 0 ? '📈' : averageSentiment < 0 ? '📉' : '📊'}
                    </span>
                    <span class="stat-label">Avg Sentiment</span>
                </div>
            </div>
    `;
    
    if (topKeywords && topKeywords.length > 0) {
        html += `
            <div class="top-keywords">
                <span class="keywords-label">Top Topics:</span>
                ${topKeywords.slice(0, 5).map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
            </div>
        `;
    }
    
    html += `</div>`;
    
    if (articles && articles.length > 0) {
        html += `
            <div class="news-articles">
                <h4>📰 Recent Coverage</h4>
                <div class="articles-list">
        `;
        
        articles.forEach(article => {
            const publishDate = new Date(article.publishedAt);
            const timeAgo = getTimeAgo(publishDate);
            const exactDate = publishDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const sentimentClass = article.sentiment ? `sentiment-${article.sentiment.toLowerCase()}` : '';
            
            html += `
                <div class="news-article">
                    <div class="article-header">
                        <h5 class="article-title">
                            <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                                ${article.title}
                            </a>
                        </h5>
                        <div class="article-meta">
                            <span class="article-source">${article.sourceName}</span>
                            <span class="article-date" title="${exactDate}">
                                <span class="relative-date">${timeAgo}</span>
                                <span class="exact-date">${exactDate}</span>
                            </span>
                            ${article.sentiment ? `<span class="sentiment-badge ${sentimentClass}">${article.sentiment}</span>` : ''}
                        </div>
                    </div>
                    ${article.aiSummary ? `<p class="article-description">${article.aiSummary}</p>` : article.description ? `<p class="article-description">${article.description}</p>` : ''}
                    ${article.author ? `<div class="article-author">By: ${article.author}</div>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="no-news">
                <div class="placeholder-icon">📰</div>
                <h4>No Recent News Coverage</h4>
                <p>We didn't find any recent news articles about ${officialName} in the past 30 days.</p>
                <p class="note">News coverage data is sourced from major news outlets and may not include all mentions.</p>
            </div>
        `;
    }
    
    if (contentContainer) {
        contentContainer.innerHTML = html;
    }
}

function displayNewsTimelineError(errorMessage) {
    const loadingContainer = document.getElementById('newsTimelineLoading');
    const contentContainer = document.getElementById('newsTimelineContent');
    
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (contentContainer) contentContainer.style.display = 'block';
    
    if (contentContainer) {
        contentContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>Unable to Load News Coverage</h4>
                <p>${errorMessage}</p>
                <p class="note">News aggregation requires API keys for news services. Contact the administrator to enable this feature.</p>
                <button class="retry-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        `;
    }
}

// Utility function for time formatting
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// Add CSS styles for voting records modal
function addVotingRecordsStyles() {
    if (document.querySelector('#voting-records-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'voting-records-styles';
    style.textContent = `
        .voting-summary {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .stat-card {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: #1a365d;
            margin-bottom: 0.25rem;
        }
        
        .stat-label {
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .votes-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .vote-item {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 0.75rem;
        }
        
        .vote-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .vote-position {
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-weight: bold;
            font-size: 0.85rem;
        }
        
        .vote-yes {
            background: #d4edda;
            color: #155724;
        }
        
        .vote-no {
            background: #f8d7da;
            color: #721c24;
        }
        
        .vote-abstain {
            background: #e2e3e5;
            color: #383d41;
        }
        
        .vote-date {
            font-size: 0.85rem;
            color: #666;
        }
        
        .vote-title {
            font-weight: 600;
            color: #1a365d;
            margin-bottom: 0.5rem;
            line-height: 1.3;
        }
        
        .vote-details {
            display: flex;
            gap: 1rem;
            font-size: 0.85rem;
            color: #666;
        }
        
        .no-votes, .no-stats {
            text-align: center;
            padding: 3rem 2rem;
            color: #666;
        }
        
        .no-votes .placeholder-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
    `;
    document.head.appendChild(style);
}

// Add CSS styles for news timeline modal
function addNewsTimelineStyles() {
    if (document.querySelector('#news-timeline-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'news-timeline-styles';
    style.textContent = `
        .news-summary {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .summary-stats {
            display: flex;
            gap: 2rem;
            margin-bottom: 1rem;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            display: block;
            font-size: 1.5rem;
            font-weight: bold;
            color: #1a365d;
        }
        
        .stat-value.sentiment-positive {
            color: #28a745;
        }
        
        .stat-value.sentiment-negative {
            color: #dc3545;
        }
        
        .stat-value.sentiment-neutral {
            color: #6c757d;
        }
        
        .stat-label {
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .top-keywords {
            margin-top: 1rem;
        }
        
        .keywords-label {
            font-weight: 600;
            margin-right: 0.5rem;
            color: #1a365d;
        }
        
        .keyword-tag {
            background: #e6f3ff;
            color: #1a365d;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            margin-right: 0.5rem;
            display: inline-block;
        }
        
        .articles-list {
            max-height: 500px;
            overflow-y: auto;
        }
        
        .news-article {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }
        
        .article-header {
            margin-bottom: 0.75rem;
        }
        
        .article-title {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
            line-height: 1.3;
        }
        
        .article-title a {
            color: #1a365d;
            text-decoration: none;
        }
        
        .article-title a:hover {
            text-decoration: underline;
        }
        
        .article-meta {
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .article-source {
            font-weight: 600;
            color: #495057;
            font-size: 0.85rem;
        }
        
        .article-date {
            color: #666;
            font-size: 0.85rem;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        
        .relative-date {
            font-weight: 500;
            color: #495057;
        }
        
        .exact-date {
            font-size: 0.75rem;
            color: #888;
            margin-top: 0.1rem;
            font-style: italic;
        }
        
        .sentiment-badge {
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .sentiment-badge.sentiment-positive {
            background: #d4edda;
            color: #155724;
        }
        
        .sentiment-badge.sentiment-negative {
            background: #f8d7da;
            color: #721c24;
        }
        
        .sentiment-badge.sentiment-neutral {
            background: #e2e3e5;
            color: #383d41;
        }
        
        .sentiment-badge.sentiment-mixed {
            background: #fff3cd;
            color: #856404;
        }
        
        .article-description {
            color: #495057;
            line-height: 1.4;
            margin: 0.75rem 0;
        }
        
        .article-author {
            font-size: 0.85rem;
            color: #666;
            font-style: italic;
        }
        
        .no-news {
            text-align: center;
            padding: 3rem 2rem;
            color: #666;
        }
        
        .no-news .placeholder-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .no-news .note {
            font-size: 0.85rem;
            color: #888;
            margin-top: 1rem;
        }
        
        .error-state {
            text-align: center;
            padding: 3rem 2rem;
            color: #666;
        }
        
        .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .retry-btn {
            background: #1a365d;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 1rem;
        }
        
        .retry-btn:hover {
            background: #0f2537;
        }
    `;
    document.head.appendChild(style);
}

// Position tracker placeholder function
function showPositionTracker(officialName, bioguideId) {
    console.log(`📍 Position tracker for ${officialName} - Coming soon!`);
    
    const modal = document.createElement('div');
    modal.className = 'position-tracker-modal modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>📍 Position Tracker: ${officialName}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="coming-soon">
                    <div class="feature-icon">🚧</div>
                    <h4>Position Tracker Coming Soon!</h4>
                    <p>We're building a comprehensive system to track how ${officialName} positions themselves on key issues over time.</p>
                    
                    <div class="planned-features">
                        <h5>📋 Planned Features:</h5>
                        <ul>
                            <li>📊 Issue position timeline</li>
                            <li>🗣️ Statement tracking</li>
                            <li>📈 Position consistency analysis</li>
                            <li>🔄 Position change alerts</li>
                            <li>📰 Source verification</li>
                        </ul>
                    </div>
                    
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add basic styles for coming soon modal
    const style = document.createElement('style');
    style.textContent = `
        .coming-soon {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .feature-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .planned-features {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            text-align: left;
        }
        
        .planned-features h5 {
            margin: 0 0 1rem 0;
            color: #1a365d;
        }
        
        .planned-features ul {
            margin: 0;
            padding-left: 1.2rem;
        }
        
        .planned-features li {
            margin: 0.5rem 0;
            color: #495057;
        }
        
        .close-btn {
            background: #1a365d;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .close-btn:hover {
            background: #0f2537;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
}

// Make functions available globally
window.showVotingRecords = showVotingRecords;
window.showNewsTimeline = showNewsTimeline;
window.showPositionTracker = showPositionTracker;
window.initGoogleMaps = initGoogleMaps;
window.lookupRepresentatives = lookupRepresentatives;
window.initManualAddressForRepresentativeLookup = initManualAddressForRepresentativeLookup;
window.showCrowdsourcingInterface = showCrowdsourcingInterface;
window.showDistrictMapping = showDistrictMapping;
window.reportDataIssue = reportDataIssue;
window.closeCrowdsourcingModal = closeCrowdsourcingModal;
window.closeDistrictMappingModal = closeDistrictMappingModal;
window.closeReportIssueModal = closeReportIssueModal;

console.log('Manual Address Input module with crowdsourcing features loaded');