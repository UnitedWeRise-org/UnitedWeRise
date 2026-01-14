/**
 * Civic Organizing Module
 * Manages civic organizing features including petitions, events, and civic browser
 *
 * Functions:
 * - showPetitionCreator: Display petition creation form
 * - showEventCreator: Display event creation form
 * - showCivicBrowser: Show civic organizing browser/dashboard
 * - showMyOrganizing: Display user's organizing activities
 * - closeCivicOrganizing: Close civic organizing interface
 */

// Import dependencies
import { apiClient } from '../../core/api/client.js';
import { showToast } from '../../utils/toast.js';

console.log('🏛️ Loading civic organizing module...');

// Setup event delegation for civic organizing module
function setupEventDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-civic-organizing-action]');
        if (!target) return;

        const action = target.dataset.civicOrganizingAction;

        switch (action) {
            case 'showDefaultOrganizingView':
                showDefaultOrganizingView();
                break;
            case 'savePetitionDraft':
                savePetitionDraft();
                break;
            case 'saveEventDraft':
                saveEventDraft();
                break;
            case 'showPetitionCreator':
                showPetitionCreator();
                break;
            case 'showEventCreator':
                showEventCreator();
                break;
            case 'showOrganizationsBrowser':
                showOrganizationsBrowser();
                break;
        }
    });
}

// Initialize event delegation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventDelegation);
} else {
    setupEventDelegation();
}

/**
 * Show Petition Creator Form
 * Displays a form for creating a new petition
 */
function showPetitionCreator() {
    if (!window.currentUser) {
        showToast('Please log in to create a petition');
        return;
    }

    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) {
        console.error('❌ Organizing content container not found');
        return;
    }

    organizingContent.innerHTML = `
        <div class="civic-form-container">
            <div class="form-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; color: #4b5c09;">📝 Create a Petition</h3>
                <button data-civic-organizing-action="showDefaultOrganizingView" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">✕</button>
            </div>

            <form id="petitionForm" style="padding: 1.5rem; max-width: 800px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Petition Title *
                    </label>
                    <input
                        type="text"
                        id="petitionTitle"
                        required
                        maxlength="150"
                        placeholder="e.g., Improve Public Transportation in Our District"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    />
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Description *
                    </label>
                    <textarea
                        id="petitionDescription"
                        required
                        rows="8"
                        maxlength="2000"
                        placeholder="Explain what you want to change and why it matters..."
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; resize: vertical;"
                    ></textarea>
                    <small style="color: #666;">Max 2000 characters</small>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Target Audience
                    </label>
                    <input
                        type="text"
                        id="petitionTarget"
                        maxlength="100"
                        placeholder="e.g., City Council, State Legislature, Community Leaders"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    />
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Signature Goal *
                    </label>
                    <input
                        type="number"
                        id="petitionGoal"
                        required
                        min="10"
                        max="1000000"
                        value="100"
                        style="width: 150px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    />
                    <small style="color: #666; margin-left: 0.5rem;">signatures</small>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                    <button
                        type="button"
                        data-civic-organizing-action="savePetitionDraft"
                        style="padding: 0.75rem 1.5rem; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
                    >
                        Save Draft
                    </button>
                    <button
                        type="submit"
                        style="padding: 0.75rem 1.5rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
                    >
                        Publish Petition
                    </button>
                </div>
            </form>
        </div>
    `;

    // Attach form submit handler
    const form = document.getElementById('petitionForm');
    if (form) {
        form.addEventListener('submit', handlePetitionSubmit);
    }
}

/**
 * Handle petition form submission
 */
async function handlePetitionSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('petitionTitle').value.trim();
    const description = document.getElementById('petitionDescription').value.trim();
    const target = document.getElementById('petitionTarget').value.trim();
    const goal = parseInt(document.getElementById('petitionGoal').value);

    if (!title || !description || !goal) {
        showToast('Please fill in all required fields');
        return;
    }

    try {
        // Show loading state
        const submitBtn = event.target.querySelector('[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        // Try to call backend endpoint
        // Note: This endpoint may not exist yet - will gracefully handle 404
        const response = await apiClient.post('/api/petitions/create', {
            title,
            description,
            target,
            goal
        });

        if (response.ok) {
            showToast('Petition created successfully!');
            showMyOrganizing(); // Show user's organizing activities
        } else {
            throw new Error('Failed to create petition');
        }
    } catch (error) {
        console.error('Error creating petition:', error);

        // Check if endpoint doesn't exist
        if (error.message.includes('404')) {
            console.log('📝 Petition API endpoint not yet implemented');
            showToast('Petition feature coming soon! Your draft has been saved locally.');
            // Save to localStorage as fallback
            savePetitionToLocalStorage({ title, description, target, goal });
            showMyOrganizing();
        } else {
            showToast('Failed to create petition. Please try again.');
        }
    } finally {
        // Reset button
        const submitBtn = event.target.querySelector('[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Publish Petition';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Save petition draft to localStorage
 */
function savePetitionDraft() {
    const title = document.getElementById('petitionTitle').value.trim();
    const description = document.getElementById('petitionDescription').value.trim();
    const target = document.getElementById('petitionTarget').value.trim();
    const goal = document.getElementById('petitionGoal').value;

    if (!title && !description) {
        showToast('Nothing to save');
        return;
    }

    const draft = {
        title,
        description,
        target,
        goal,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('petitionDraft', JSON.stringify(draft));
    showToast('Draft saved!');
}

/**
 * Save petition to localStorage (fallback when API not available)
 */
function savePetitionToLocalStorage(petitionData) {
    const petitions = JSON.parse(localStorage.getItem('localPetitions') || '[]');
    petitions.push({
        ...petitionData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        signatures: 0,
        createdBy: window.currentUser?.id || 'unknown'
    });
    localStorage.setItem('localPetitions', JSON.stringify(petitions));
}

/**
 * Show Event Creator Form
 * Displays a form for organizing a new event
 */
function showEventCreator() {
    if (!window.currentUser) {
        showToast('Please log in to organize an event');
        return;
    }

    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) {
        console.error('❌ Organizing content container not found');
        return;
    }

    organizingContent.innerHTML = `
        <div class="civic-form-container">
            <div class="form-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0; color: #1976d2;">📅 Organize an Event</h3>
                <button data-civic-organizing-action="showDefaultOrganizingView" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">✕</button>
            </div>

            <form id="eventForm" style="padding: 1.5rem; max-width: 800px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Event Title *
                    </label>
                    <input
                        type="text"
                        id="eventTitle"
                        required
                        maxlength="150"
                        placeholder="e.g., Town Hall on Climate Action"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    />
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Description *
                    </label>
                    <textarea
                        id="eventDescription"
                        required
                        rows="6"
                        maxlength="2000"
                        placeholder="Describe what will happen at this event..."
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; resize: vertical;"
                    ></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                            Date *
                        </label>
                        <input
                            type="date"
                            id="eventDate"
                            required
                            min="${new Date().toISOString().split('T')[0]}"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                            Time *
                        </label>
                        <input
                            type="time"
                            id="eventTime"
                            required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                        />
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Location *
                    </label>
                    <input
                        type="text"
                        id="eventLocation"
                        required
                        maxlength="200"
                        placeholder="e.g., City Hall, 123 Main St, Springfield"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    />
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333;">
                        Category *
                    </label>
                    <select
                        id="eventCategory"
                        required
                        style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;"
                    >
                        <option value="">Select a category...</option>
                        <option value="rally">Rally/Protest</option>
                        <option value="townhall">Town Hall</option>
                        <option value="volunteer">Volunteer Event</option>
                        <option value="fundraiser">Fundraiser</option>
                        <option value="meetup">Community Meetup</option>
                        <option value="workshop">Workshop/Training</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                    <button
                        type="button"
                        data-civic-organizing-action="saveEventDraft"
                        style="padding: 0.75rem 1.5rem; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
                    >
                        Save Draft
                    </button>
                    <button
                        type="submit"
                        style="padding: 0.75rem 1.5rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem;"
                    >
                        Publish Event
                    </button>
                </div>
            </form>
        </div>
    `;

    // Attach form submit handler
    const form = document.getElementById('eventForm');
    if (form) {
        form.addEventListener('submit', handleEventSubmit);
    }
}

/**
 * Handle event form submission
 */
async function handleEventSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const category = document.getElementById('eventCategory').value;

    if (!title || !description || !date || !time || !location || !category) {
        showToast('Please fill in all required fields');
        return;
    }

    try {
        // Show loading state
        const submitBtn = event.target.querySelector('[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;

        // Combine date and time
        const dateTime = `${date}T${time}:00`;

        // Try to call backend endpoint
        const response = await apiClient.post('/api/events/create', {
            title,
            description,
            dateTime,
            location,
            category
        });

        if (response.ok) {
            showToast('Event created successfully!');
            showMyOrganizing();
        } else {
            throw new Error('Failed to create event');
        }
    } catch (error) {
        console.error('Error creating event:', error);

        // Check if endpoint doesn't exist
        if (error.message.includes('404')) {
            console.log('📅 Event API endpoint not yet implemented');
            showToast('Event feature coming soon! Your draft has been saved locally.');
            // Save to localStorage as fallback
            const dateTime = `${document.getElementById('eventDate').value}T${document.getElementById('eventTime').value}:00`;
            saveEventToLocalStorage({ title, description, dateTime, location, category });
            showMyOrganizing();
        } else {
            showToast('Failed to create event. Please try again.');
        }
    } finally {
        // Reset button
        const submitBtn = event.target.querySelector('[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Publish Event';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Save event draft to localStorage
 */
function saveEventDraft() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const location = document.getElementById('eventLocation').value.trim();
    const category = document.getElementById('eventCategory').value;

    if (!title && !description) {
        showToast('Nothing to save');
        return;
    }

    const draft = {
        title,
        description,
        date,
        time,
        location,
        category,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('eventDraft', JSON.stringify(draft));
    showToast('Draft saved!');
}

/**
 * Save event to localStorage (fallback when API not available)
 */
function saveEventToLocalStorage(eventData) {
    const events = JSON.parse(localStorage.getItem('localEvents') || '[]');
    events.push({
        ...eventData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        rsvps: 0,
        createdBy: window.currentUser?.id || 'unknown'
    });
    localStorage.setItem('localEvents', JSON.stringify(events));
}

/**
 * Show Civic Browser
 * Displays a browser/dashboard of civic organizing activities
 */
async function showCivicBrowser() {
    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) {
        console.error('❌ Organizing content container not found');
        return;
    }

    // Show loading state
    organizingContent.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
            <p>Loading civic activities...</p>
        </div>
    `;

    try {
        // Try to fetch from backend
        const [petitionsResponse, eventsResponse] = await Promise.all([
            apiClient.get('/api/petitions').catch(() => null),
            apiClient.get('/api/events').catch(() => null)
        ]);

        const petitions = petitionsResponse?.ok ? petitionsResponse.data?.data : [];
        const events = eventsResponse?.ok ? eventsResponse.data?.data : [];

        // If no backend data, use localStorage
        const localPetitions = JSON.parse(localStorage.getItem('localPetitions') || '[]');
        const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');

        const allPetitions = [...(petitions || []), ...localPetitions];
        const allEvents = [...(events || []), ...localEvents];

        displayCivicBrowser(allPetitions, allEvents);
    } catch (error) {
        console.error('Error loading civic browser:', error);

        // Fallback to localStorage only
        const localPetitions = JSON.parse(localStorage.getItem('localPetitions') || '[]');
        const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');

        displayCivicBrowser(localPetitions, localEvents);
    }
}

/**
 * Display civic browser with petitions and events
 */
function displayCivicBrowser(petitions, events) {
    const organizingContent = document.getElementById('organizingContent');

    const petitionsList = petitions.length > 0 ? petitions.map(p => `
        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0; color: #4b5c09;">${p.title}</h4>
            <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">${p.description.substring(0, 150)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666; font-size: 0.9rem;">
                    ${p.signatures || 0} / ${p.goal} signatures
                </span>
                <button style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Sign
                </button>
            </div>
        </div>
    `).join('') : '<p style="color: #666; text-align: center; padding: 2rem;">No petitions yet. Be the first to create one!</p>';

    const eventsList = events.length > 0 ? events.map(e => {
        const eventDate = new Date(e.dateTime);
        return `
            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">${e.title}</h4>
                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">${e.description.substring(0, 120)}...</p>
                <div style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">
                    <div>📅 ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}</div>
                    <div>📍 ${e.location}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666; font-size: 0.9rem;">
                        ${e.rsvps || 0} RSVPs
                    </span>
                    <button style="padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        RSVP
                    </button>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: #666; text-align: center; padding: 2rem;">No events yet. Be the first to organize one!</p>';

    organizingContent.innerHTML = `
        <div style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #333;">🔍 Browse Civic Activities</h3>
                <button data-civic-organizing-action="showDefaultOrganizingView" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">✕</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #4b5c09;">📝 Petitions</h4>
                        <button data-civic-organizing-action="showPetitionCreator" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                            Create
                        </button>
                    </div>
                    ${petitionsList}
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #1976d2;">📅 Events</h4>
                        <button data-civic-organizing-action="showEventCreator" style="padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                            Create
                        </button>
                    </div>
                    ${eventsList}
                </div>
            </div>
        </div>
    `;
}

/**
 * Show My Organizing
 * Displays user's organizing activities
 */
async function showMyOrganizing() {
    if (!window.currentUser) {
        showToast('Please log in to view your activities');
        return;
    }

    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) {
        console.error('❌ Organizing content container not found');
        return;
    }

    // Show loading state
    organizingContent.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">📊</div>
            <p>Loading your activities...</p>
        </div>
    `;

    try {
        // Try to fetch from backend
        const userId = window.currentUser.id;
        const [myPetitionsResponse, myEventsResponse] = await Promise.all([
            apiClient.get(`/api/petitions/user/${userId}`).catch(() => null),
            apiClient.get(`/api/events/user/${userId}`).catch(() => null)
        ]);

        const myPetitions = myPetitionsResponse?.ok ? myPetitionsResponse.data?.data : [];
        const myEvents = myEventsResponse?.ok ? myEventsResponse.data?.data : [];

        // Fallback to localStorage
        const localPetitions = JSON.parse(localStorage.getItem('localPetitions') || '[]')
            .filter(p => p.createdBy === userId);
        const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]')
            .filter(e => e.createdBy === userId);

        const allMyPetitions = [...(myPetitions || []), ...localPetitions];
        const allMyEvents = [...(myEvents || []), ...localEvents];

        displayMyOrganizing(allMyPetitions, allMyEvents);
    } catch (error) {
        console.error('Error loading user activities:', error);

        // Fallback to localStorage only
        const userId = window.currentUser.id;
        const localPetitions = JSON.parse(localStorage.getItem('localPetitions') || '[]')
            .filter(p => p.createdBy === userId);
        const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]')
            .filter(e => e.createdBy === userId);

        displayMyOrganizing(localPetitions, localEvents);
    }
}

/**
 * Display user's organizing activities
 */
function displayMyOrganizing(myPetitions, myEvents) {
    const organizingContent = document.getElementById('organizingContent');

    const hasActivities = myPetitions.length > 0 || myEvents.length > 0;

    if (!hasActivities) {
        organizingContent.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <h3 style="color: #333; margin-bottom: 1rem;">Your Organizing Activities</h3>
                <p style="color: #666; margin-bottom: 2rem;">You haven't created any petitions or events yet.</p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button data-civic-organizing-action="showPetitionCreator" style="padding: 1rem 2rem; background: #4b5c09; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Create Your First Petition
                    </button>
                    <button data-civic-organizing-action="showEventCreator" style="padding: 1rem 2rem; background: #1976d2; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Organize Your First Event
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const petitionsList = myPetitions.map(p => `
        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
            <h4 style="margin: 0 0 0.5rem 0; color: #4b5c09;">${p.title}</h4>
            <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">${p.description.substring(0, 100)}...</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666; font-size: 0.9rem;">
                    ${p.signatures || 0} / ${p.goal} signatures
                </span>
                <span style="color: #999; font-size: 0.85rem;">
                    Created ${new Date(p.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    `).join('');

    const eventsList = myEvents.map(e => {
        const eventDate = new Date(e.dateTime);
        return `
            <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">${e.title}</h4>
                <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem;">${e.description.substring(0, 100)}...</p>
                <div style="margin: 0.5rem 0; font-size: 0.9rem; color: #666;">
                    <div>📅 ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}</div>
                    <div>📍 ${e.location}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666; font-size: 0.9rem;">
                        ${e.rsvps || 0} RSVPs
                    </span>
                    <span style="color: #999; font-size: 0.85rem;">
                        Created ${new Date(e.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    organizingContent.innerHTML = `
        <div style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #333;">📊 My Organizing Activities</h3>
                <button data-civic-organizing-action="showDefaultOrganizingView" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">✕</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #4b5c09;">📝 My Petitions (${myPetitions.length})</h4>
                        <button data-civic-organizing-action="showPetitionCreator" style="padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                            Create New
                        </button>
                    </div>
                    ${petitionsList || '<p style="color: #666; text-align: center; padding: 2rem;">No petitions yet</p>'}
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: #1976d2;">📅 My Events (${myEvents.length})</h4>
                        <button data-civic-organizing-action="showEventCreator" style="padding: 0.5rem 1rem; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                            Create New
                        </button>
                    </div>
                    ${eventsList || '<p style="color: #666; text-align: center; padding: 2rem;">No events yet</p>'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Close Civic Organizing
 * Closes the civic organizing interface and returns to previous view
 */
function closeCivicOrganizing() {
    const container = document.getElementById('civicOrganizingContainer');
    if (container) {
        container.style.display = 'none';
    }

    // Clean up any modal overlays
    const overlays = document.querySelectorAll('.civic-form-overlay');
    overlays.forEach(overlay => overlay.remove());

    // Return to default view
    if (typeof window.showDefaultView === 'function') {
        window.showDefaultView();
    }
}

/**
 * Show default organizing view
 * Displays the welcome screen for civic organizing
 */
function showDefaultOrganizingView() {
    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) return;

    organizingContent.innerHTML = `
        <div style="text-align: center; color: #666; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏛️</div>
            <h3>Welcome to Civic Organizing</h3>
            <p>Create petitions, organize events, join organizations, and mobilize your community for positive change.</p>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button data-civic-organizing-action="showPetitionCreator" style="padding: 1rem 2rem; background: #4b5c09; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Start a Petition
                </button>
                <button data-civic-organizing-action="showEventCreator" style="padding: 1rem 2rem; background: #1976d2; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Organize an Event
                </button>
                <button data-civic-organizing-action="showOrganizationsBrowser" style="padding: 1rem 2rem; background: #7b1fa2; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    🏢 Organizations
                </button>
            </div>
        </div>
    `;
}

/**
 * Show Organizations Browser
 * Displays the organizations module in the civic organizing panel
 */
async function showOrganizationsBrowser() {
    const organizingContent = document.getElementById('organizingContent');
    if (!organizingContent) {
        console.error('❌ Organizing content container not found');
        return;
    }

    // Dynamically import and initialize organizations browser
    try {
        const { initOrgBrowser } = await import('../organizations/index.js');
        await initOrgBrowser(organizingContent);
    } catch (error) {
        console.error('❌ Failed to load organizations module:', error);
        showToast('Failed to load organizations');
        organizingContent.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p>⚠️ Failed to load organizations</p>
                <button data-civic-organizing-action="showDefaultOrganizingView" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Go Back
                </button>
            </div>
        `;
    }
}

// Export for module system
export {
    showPetitionCreator,
    showEventCreator,
    showCivicBrowser,
    showMyOrganizing,
    closeCivicOrganizing,
    showDefaultOrganizingView,
    showOrganizationsBrowser,
    savePetitionDraft,
    saveEventDraft
};

// Global exposure for compatibility (temporary during migration)
if (typeof window !== 'undefined') {
    window.showPetitionCreator = showPetitionCreator;
    window.showEventCreator = showEventCreator;
    window.showCivicBrowser = showCivicBrowser;
    window.showMyOrganizing = showMyOrganizing;
    window.closeCivicOrganizing = closeCivicOrganizing;
    window.showDefaultOrganizingView = showDefaultOrganizingView;
    window.showOrganizationsBrowser = showOrganizationsBrowser;
    window.savePetitionDraft = savePetitionDraft;
    window.saveEventDraft = saveEventDraft;
    console.log('🌐 Civic organizing functions available globally');
}

console.log('✅ Civic organizing module loaded');