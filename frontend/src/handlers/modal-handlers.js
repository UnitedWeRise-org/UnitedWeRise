/**
 * Modal Handlers Module - Phase 5 of ES6 Modularization
 * Extracted from index.html lines 1136-1246
 * Handles About Modal and Volunteer Modal functionality
 *
 * Functions Extracted:
 * - openAboutModal() [line 1136]
 * - closeAboutModal() [line 1140]
 * - openVolunteerModal() [line 1157]
 * - closeVolunteerModal() [line 1182]
 * - Volunteer form submission handler [lines 1200-1246]
 */

export class ModalHandlers {
    constructor() {
        this.setupEventListeners();
        this.setupClickOutsideHandlers();
        this.setupVolunteerFormHandler();
    }

    /**
     * Open About Modal
     * Extracted from index.html line 1136
     */
    openAboutModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    /**
     * Close About Modal
     * Extracted from index.html line 1140
     */
    closeAboutModal() {
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    /**
     * Open Volunteer Modal
     * Extracted from index.html line 1157
     */
    openVolunteerModal() {
        const modal = document.getElementById('volunteerModal');
        const emailSection = document.getElementById('emailSection');

        if (!modal) return;

        // Show email field if user is not logged in
        const emailInput = document.getElementById('volunteerEmail');
        if (!window.currentUser) {
            if (emailSection) emailSection.style.display = 'block';
            if (emailInput) emailInput.required = true;
        } else {
            if (emailSection) emailSection.style.display = 'none';
            if (emailInput) emailInput.required = false; // Remove required attribute for logged-in users
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Set up character counter
        const messageTextarea = document.getElementById('volunteerMessage');
        const charCount = document.getElementById('charCount');

        if (messageTextarea && charCount) {
            // Remove any existing event listener to prevent duplicates
            messageTextarea.removeEventListener('input', this.handleCharacterCount);
            // Add the event listener with proper binding
            this.handleCharacterCount = () => {
                charCount.textContent = messageTextarea.value.length;
            };
            messageTextarea.addEventListener('input', this.handleCharacterCount);
        }
    }

    /**
     * Close Volunteer Modal
     * Extracted from index.html line 1182
     */
    closeVolunteerModal() {
        const modal = document.getElementById('volunteerModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling

            // Reset form
            const volunteerForm = document.getElementById('volunteerForm');
            if (volunteerForm) {
                volunteerForm.reset();
            }

            const charCount = document.getElementById('charCount');
            if (charCount) {
                charCount.textContent = '0';
            }
        }
    }

    /**
     * Setup event listeners for modal triggers
     * Replaces inline onclick handlers with event delegation
     */
    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const target = event.target;

            // Handle About Modal triggers
            if (target.hasAttribute('data-modal-about') ||
                (target.classList && target.classList.contains('nav-link') && target.textContent.includes('About UWR'))) {
                event.preventDefault();
                this.openAboutModal();
                return;
            }

            // Handle Volunteer Modal triggers
            if (target.hasAttribute('data-modal-volunteer') ||
                (target.textContent && target.textContent.includes('Volunteer your skills'))) {
                event.preventDefault();
                this.openVolunteerModal();
                return;
            }

            // Handle modal close buttons
            if (target.hasAttribute('data-modal-close')) {
                event.preventDefault();
                const modalType = target.getAttribute('data-modal-close');
                if (modalType === 'about') {
                    this.closeAboutModal();
                } else if (modalType === 'volunteer') {
                    this.closeVolunteerModal();
                }
                return;
            }

            // Handle modal action buttons (complex actions)
            if (target.hasAttribute('data-modal-action')) {
                event.preventDefault();
                const action = target.getAttribute('data-modal-action');
                switch (action) {
                    case 'join-community':
                        this.closeAboutModal();
                        // Open auth modal for login
                        if (window.openAuthModal) {
                            window.openAuthModal('login');
                        } else {
                            // Fallback to legacy modal if auth modal not available
                            const loginModal = document.getElementById('loginModal');
                            if (loginModal) {
                                loginModal.style.display = 'block';
                            }
                        }
                        break;
                    case 'support-mission':
                        this.closeAboutModal();
                        window.location.href = '/donate.html';
                        break;
                    case 'volunteer-skills':
                        this.closeAboutModal();
                        this.openVolunteerModal();
                        break;
                }
                return;
            }

            // Handle specific close button clicks (legacy support)
            if (target.textContent === '×' && target.onclick) {
                const onclickStr = target.onclick.toString();
                if (onclickStr.includes('closeAboutModal')) {
                    event.preventDefault();
                    this.closeAboutModal();
                } else if (onclickStr.includes('closeVolunteerModal')) {
                    event.preventDefault();
                    this.closeVolunteerModal();
                }
            }
        });
    }

    /**
     * Setup click-outside-to-close functionality for modals
     * Extracted from index.html lines 1145-1198
     */
    setupClickOutsideHandlers() {
        // About Modal click-outside handler
        const aboutModal = document.getElementById('aboutModal');
        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    this.closeAboutModal();
                }
            });
        }

        // Volunteer Modal click-outside handler
        const volunteerModal = document.getElementById('volunteerModal');
        if (volunteerModal) {
            volunteerModal.addEventListener('click', (e) => {
                if (e.target === volunteerModal) {
                    this.closeVolunteerModal();
                }
            });
        }

        // Keyboard support - close modals on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const aboutModal = document.getElementById('aboutModal');
                const volunteerModal = document.getElementById('volunteerModal');

                if (aboutModal && aboutModal.style.display === 'block') {
                    this.closeAboutModal();
                } else if (volunteerModal && volunteerModal.style.display === 'block') {
                    this.closeVolunteerModal();
                }
            }
        });
    }

    /**
     * Setup volunteer form submission handler
     * Extracted from index.html lines 1200-1246
     */
    setupVolunteerFormHandler() {
        const volunteerForm = document.getElementById('volunteerForm');
        if (volunteerForm) {
            volunteerForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = document.getElementById('volunteerSubmitBtn');
                if (!submitBtn) return;

                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Sending...';
                submitBtn.disabled = true;

                try {
                    const message = document.getElementById('volunteerMessage').value.trim();
                    const email = document.getElementById('volunteerEmail').value.trim();

                    if (!message) {
                        alert('Please enter your message.');
                        return;
                    }

                    // Check if user is logged in
                    // For non-logged in users, require email
                    if (!window.currentUser && !email) {
                        alert('Please enter your email address.');
                        return;
                    }

                    // Create post using unified volunteer system
                    const result = await window.createPostVolunteer(message, email);

                    if (result.success) {
                        alert('Thank you! Your volunteer inquiry has been submitted. We\'ll review it and get back to you soon.');
                        this.closeVolunteerModal();
                    } else {
                        throw new Error(result.error || 'Failed to submit inquiry');
                    }

                } catch (error) {
                    console.error('Error submitting volunteer inquiry:', error);
                    alert('Error submitting your inquiry. Please try again.');
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }
}

// Create global instance
const modalHandlers = new ModalHandlers();

// Export functions for backward compatibility
export const openAboutModal = () => modalHandlers.openAboutModal();
export const closeAboutModal = () => modalHandlers.closeAboutModal();
export const openVolunteerModal = () => modalHandlers.openVolunteerModal();
export const closeVolunteerModal = () => modalHandlers.closeVolunteerModal();

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.openAboutModal = openAboutModal;
    window.closeAboutModal = closeAboutModal;
    window.openVolunteerModal = openVolunteerModal;
    window.closeVolunteerModal = closeVolunteerModal;
    window.modalHandlers = modalHandlers;
}