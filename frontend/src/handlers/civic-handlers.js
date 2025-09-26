/**
 * CIVIC HANDLERS MODULE
 * Comprehensive civic engagement system management for United We Rise
 *
 * Handles:
 * - Elected officials loading and display
 * - User profile and content loading
 * - Radio button state management (national/state/local selection)
 * - Official detail panels
 * - Authentication storage management
 *
 * @module handlers/civic-handlers
 */

console.log('🏛️ Loading civic-handlers.js module...');

export class CivicHandlers {
    constructor() {
        console.log('🏛️ Initializing CivicHandlers...');

        // Initialize event listeners with delegation
        this.initializeEventListeners();

        console.log('✅ CivicHandlers initialized successfully');
    }

    /**
     * Initialize event delegation for civic controls
     */
    initializeEventListeners() {
        // Detail panel close button
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-detail]') || e.target.closest('[data-close-detail]')) {
                e.preventDefault();
                this.closeDetail();
            }
        });

        // Radio button change handlers for zoom level selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="zoomLevel"]')) {
                const level = e.target.value;
                console.log(`🔧 Zoom level changed to: ${level}`);
                // Radio button state is handled by the input itself
                // Additional logic can be added here if needed
            }
        });

        console.log('🎯 Civic event delegation initialized');
    }

    /**
     * Load user profile and content data
     * Merges profile data into currentUser and triggers officials loading
     */
    async loadUserContent() {
        console.log('👤 Loading user content...');

        try {
            const response = await window.apiCall('/users/profile');

            if (response.ok) {
                const data = response.data;

                // Merge the complete profile data into currentUser
                if (data.user) {
                    // Debug: Check what's in the profile data
                    console.log('🔍 Profile data before merge:', data.user);
                    console.log('🔍 currentUser before merge:', window.currentUser);

                    // Only merge non-null values to avoid overwriting good data with undefined
                    const mergedUser = { ...window.currentUser };
                    for (const [key, value] of Object.entries(data.user)) {
                        if (value !== null && value !== undefined) {
                            mergedUser[key] = value;
                        }
                    }
                    window.currentUser = mergedUser;
                    console.log('User profile data merged into currentUser:', window.currentUser);

                    // Re-update the greeting if it got cleared
                    const displayName = window.currentUser.firstName || window.currentUser.username || 'User';
                    const greetingElement = document.getElementById('userGreeting');
                    if (greetingElement) {
                        greetingElement.textContent = `Hello, ${displayName}!`;
                        console.log('🔧 Re-set greeting after profile merge to:', greetingElement.textContent);
                    }

                    // Update radio button availability now that we have address data
                    this.updateRadioButtonAvailability();

                    // Load representatives if we have address
                    if (data.user.zipCode && data.user.state) {
                        this.loadElectedOfficials(data.user.zipCode, data.user.state);
                    }

                    // Update map location if we have address
                    if (typeof mapInstance !== 'undefined' && window.currentUser.state) {
                        if (typeof getCurrentUserLocation === 'function') {
                            getCurrentUserLocation();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load user content:', error);
        }
    }

    /**
     * Load elected officials for the user's location
     * @param {string} zipCode - User's zip code
     * @param {string} state - User's state abbreviation
     */
    async loadElectedOfficials(zipCode, state) {
        console.log(`🏛️ Loading elected officials for ${zipCode}, ${state}...`);

        try {
            const response = await window.apiCall('/political/representatives');

            if (response.ok && response.data) {
                const representatives = response.data.representatives;
                this.updateOfficialsPanel(representatives);

                // Extract district information for boundary loading
                console.log('Representatives data received:', representatives);

                if (representatives && representatives.federal) {
                    console.log('Federal representatives:', representatives.federal);

                    const districtRep = representatives.federal.find(rep =>
                        rep.office && rep.office.includes('Representative')
                    );

                    console.log('Found district rep:', districtRep);

                    if (districtRep) {
                        let districtNumber = null;
                        let stateAbbr = null;

                        // First try to use the district field directly
                        if (districtRep.district) {
                            console.log('District field found:', districtRep.district);

                            // District field might be like "IL-10" or just "10"
                            const districtMatch = districtRep.district.match(/(?:(\w{2})-)?(\d+)/);
                            if (districtMatch) {
                                stateAbbr = districtMatch[1] || (window.currentUser && window.currentUser.state);
                                districtNumber = districtMatch[2];
                            }
                        }

                        // Fallback: try to extract from office title
                        if (!districtNumber && districtRep.office) {
                            console.log('Fallback: parsing office title:', districtRep.office);
                            const officeMatch = districtRep.office.match(/(\w{2})-(\d+)/);
                            if (officeMatch) {
                                stateAbbr = officeMatch[1];
                                districtNumber = officeMatch[2];
                            }
                        }

                        if (districtNumber && stateAbbr) {
                            // Store district info for boundary loading
                            if (!window.currentUser) {
                                window.currentUser = {};
                            }
                            window.currentUser.district = districtNumber;
                            window.currentUser.state = stateAbbr;

                            console.log(`District info extracted: ${window.currentUser.state}-${window.currentUser.district}`);

                            // Load boundary if currently at local zoom
                            if (typeof currentZoomLevel !== 'undefined' && currentZoomLevel === 'local' &&
                                typeof boundaryManager !== 'undefined' && typeof currentLocation !== 'undefined') {
                                console.log('Loading district boundary...');
                                boundaryManager.loadBoundary('district', window.currentUser.district, window.currentUser.state);
                            }
                        } else {
                            console.warn('Could not extract district information from representative data');
                        }
                    } else {
                        console.warn('No district representative found in federal representatives');
                    }
                } else {
                    console.warn('No federal representatives found in response');
                }
            } else {
                console.log('No representatives data available yet - may need address in profile');
            }
        } catch (error) {
            console.error('Failed to load representatives:', error);
        }
    }

    /**
     * Update officials panel with representative data
     * @param {Object} representatives - Object containing federal, state, and local representatives
     */
    updateOfficialsPanel(representatives) {
        console.log('🏛️ Updating officials panel...');

        const content = document.getElementById('officialsContent');
        if (!content) {
            console.warn('Officials content element not found');
            return;
        }

        // Check if representatives object has any data
        const totalReps = (representatives.federal || []).length +
                          (representatives.state || []).length +
                          (representatives.local || []).length;

        if (totalReps === 0) {
            content.innerHTML = '<p>No representatives found. Please add your complete address in your profile.</p>';
            return;
        }

        let html = '<div>';

        // Federal representatives
        if (representatives.federal && representatives.federal.length > 0) {
            html += '<h3>Federal Representatives</h3>';
            representatives.federal.forEach(rep => {
                html += `
                    <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; background: white;">
                        <h4>${rep.name || 'Unknown'}</h4>
                        <p><strong>${rep.office || 'Office Unknown'}</strong></p>
                        ${rep.party ? `<p>Party: ${rep.party}</p>` : ''}
                        ${rep.phones && rep.phones.length > 0 ? `<p>Phone: ${rep.phones[0]}</p>` : ''}
                        ${rep.urls && rep.urls.length > 0 ? `<p><a href="${rep.urls[0]}" target="_blank" rel="noopener">Official Website</a></p>` : ''}
                    </div>
                `;
            });
        }

        // State representatives
        if (representatives.state && representatives.state.length > 0) {
            html += '<h3>State Representatives</h3>';
            representatives.state.forEach(rep => {
                html += `
                    <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; background: white;">
                        <h4>${rep.name || 'Unknown'}</h4>
                        <p><strong>${rep.office || 'Office Unknown'}</strong></p>
                        ${rep.party ? `<p>Party: ${rep.party}</p>` : ''}
                        ${rep.phones && rep.phones.length > 0 ? `<p>Phone: ${rep.phones[0]}</p>` : ''}
                        ${rep.urls && rep.urls.length > 0 ? `<p><a href="${rep.urls[0]}" target="_blank" rel="noopener">Official Website</a></p>` : ''}
                    </div>
                `;
            });
        }

        // Local representatives
        if (representatives.local && representatives.local.length > 0) {
            html += '<h3>Local Representatives</h3>';
            representatives.local.forEach(rep => {
                html += `
                    <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; background: white;">
                        <h4>${rep.name || 'Unknown'}</h4>
                        <p><strong>${rep.office || 'Office Unknown'}</strong></p>
                        ${rep.party ? `<p>Party: ${rep.party}</p>` : ''}
                        ${rep.phones && rep.phones.length > 0 ? `<p>Phone: ${rep.phones[0]}</p>` : ''}
                        ${rep.urls && rep.urls.length > 0 ? `<p><a href="${rep.urls[0]}" target="_blank" rel="noopener">Official Website</a></p>` : ''}
                    </div>
                `;
            });
        }

        html += '</div>';
        content.innerHTML = html;

        console.log('✅ Officials panel updated successfully');
    }

    /**
     * Open official detail panel
     * @param {string} title - Title for the detail panel
     * @param {number} offset - Vertical offset for positioning
     */
    openDetail(title, offset) {
        console.log(`Opening detail panel for: ${title}`);

        const panel = document.getElementById('detail-panel');
        if (!panel) {
            console.warn('Detail panel element not found');
            return;
        }

        const titleElement = document.getElementById('detail-title');
        const contentElement = document.getElementById('detail-content');

        if (titleElement) {
            titleElement.innerText = title;
        }
        if (contentElement) {
            contentElement.innerText = `Placeholder content for ${title}.`;
        }

        panel.dataset.offset = offset;
        panel.classList.remove('hidden');
    }

    /**
     * Close official detail panel
     */
    closeDetail() {
        console.log('Closing detail panel');

        const panel = document.getElementById('detail-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    /**
     * Enable/disable radio buttons based on available location data
     * Updates state and local radio buttons depending on user's address data
     */
    updateRadioButtonAvailability() {
        console.log('🔧 Updating radio button availability...');

        const stateRadio = document.querySelector('input[name="zoomLevel"][value="state"]');
        const localRadio = document.querySelector('input[name="zoomLevel"][value="local"]');
        const stateLabel = stateRadio?.parentElement;
        const localLabel = localRadio?.parentElement;

        // Check if user has location data
        const hasState = window.currentUser && window.currentUser.state;
        const hasAddress = window.currentUser && (window.currentUser.zipCode || window.currentUser.city) && window.currentUser.state;

        // Enable/disable state radio
        if (stateRadio && stateLabel) {
            stateRadio.disabled = !hasState;
            stateLabel.style.opacity = hasState ? '1' : '0.5';
            stateLabel.style.cursor = hasState ? 'pointer' : 'not-allowed';
        }

        // Enable/disable local radio
        if (localRadio && localLabel) {
            localRadio.disabled = !hasAddress;
            localLabel.style.opacity = hasAddress ? '1' : '0.5';
            localLabel.style.cursor = hasAddress ? 'pointer' : 'not-allowed';
        }

        console.log(`Radio button availability - State: ${hasState}, Local: ${hasAddress}`);
    }

    /**
     * Update radio button selection state
     * @param {string} level - 'national', 'state', or 'local'
     */
    updateRadioButtonState(level) {
        console.log(`🔧 Updating radio button state to: ${level}`);

        // Update radio button to match current zoom level
        const radios = document.querySelectorAll('input[name="zoomLevel"]');
        radios.forEach(radio => {
            radio.checked = radio.value === level;
        });
    }

    /**
     * Fix authentication storage issues
     * Clears legacy tokens and resets UI to logged-out state
     * @returns {string} Status message
     */
    fixAuthStorageIssues() {
        console.log('🔧 Fixing auth storage issues...');

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AuthSystem', 'Fixing auth storage issues');
        }

        localStorage.removeItem('authToken'); // Clear any legacy tokens
        localStorage.removeItem('currentUser');
        window.currentUser = null;

        // Reset UI to logged out state
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userGreeting = document.getElementById('userGreeting');

        if (authSection) authSection.style.display = 'flex';
        if (userSection) userSection.style.display = 'none';
        if (userGreeting) userGreeting.textContent = '';

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('AuthSystem', 'Auth storage cleared. Please log in again.');
        }

        console.log('✅ Auth storage cleared successfully');
        return 'Auth storage cleared. Please refresh the page and log in again.';
    }
}

// Create singleton instance
const civicHandlers = new CivicHandlers();

// Global exports for backward compatibility
window.CivicHandlers = civicHandlers;
window.loadUserContent = () => civicHandlers.loadUserContent();
window.loadElectedOfficials = (zipCode, state) => civicHandlers.loadElectedOfficials(zipCode, state);
window.updateOfficialsPanel = (representatives) => civicHandlers.updateOfficialsPanel(representatives);
window.openDetail = (title, offset) => civicHandlers.openDetail(title, offset);
window.closeDetail = () => civicHandlers.closeDetail();
window.updateRadioButtonAvailability = () => civicHandlers.updateRadioButtonAvailability();
window.updateRadioButtonState = (level) => civicHandlers.updateRadioButtonState(level);
window.fixAuthStorageIssues = () => civicHandlers.fixAuthStorageIssues();

console.log('✅ Civic handlers module loaded and exported globally');

export { civicHandlers };