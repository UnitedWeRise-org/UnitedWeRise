/**
 * @module js/legal-modal
 * @description Legal documents modal handler
 *
 * Displays Terms of Service, Privacy Policy, and other legal documents
 * in modal windows with keyboard navigation and accessibility support.
 *
 * Migrated to ES6 modules: October 11, 2025 (Batch 4)
 */

// Legal document content storage
const legalDocuments = {
    terms: {
        title: "Terms of Service",
        content: `
            <div style="line-height: 1.6; color: #333;">
                <h3>United We Rise - Terms of Service</h3>
                <p>By accessing or using United We Rise ("the Platform"), you agree to be bound by these Terms of Service. The Platform is operated by People United for Peaceful Revolution, Inc. ("PUPR"), a 501(c)(3) nonprofit organization.</p>
                <p>Key points:</p>
                <ul>
                    <li>You agree to use the Platform for lawful civic engagement only</li>
                    <li>You retain ownership of content you post</li>
                    <li>The Platform is provided "as is" without warranties</li>
                    <li>These Terms are governed by the laws of the State of New York</li>
                </ul>
                <p style="margin-top: 1rem;"><a href="/terms-of-service" target="_blank" style="color: #4b5c09; font-weight: bold;">Read the full Terms of Service &rarr;</a></p>
            </div>
        `
    },
    privacy: {
        title: "Privacy Policy",
        content: `
            <div style="line-height: 1.6; color: #333;">
                <h3>United We Rise - Privacy Policy</h3>
                <p>United We Rise is operated by People United for Peaceful Revolution, Inc. ("PUPR"), a 501(c)(3) nonprofit. We do not sell your data. We do not use your data for advertising. We collect only what is necessary to operate the platform.</p>
                <p>Key points:</p>
                <ul>
                    <li>We collect your email, username, and optional profile information</li>
                    <li>We use your data to provide civic engagement features and improve the platform</li>
                    <li>We share limited data with service providers (Google APIs, hCaptcha, Azure, Stripe)</li>
                    <li>You can request a copy, correction, or deletion of your data at any time</li>
                    <li>We do not knowingly collect information from children under 13</li>
                </ul>
                <p>Contact: <a href="mailto:contact@unitedwerise.org" style="color: #4b5c09;">contact@unitedwerise.org</a></p>
                <p style="margin-top: 1rem;"><a href="/privacy-policy" target="_blank" style="color: #4b5c09; font-weight: bold;">Read the full Privacy Policy &rarr;</a></p>
            </div>
        `
    }
};

// Open legal modal with specific document
function openLegalModal(documentType) {
    const modal = document.getElementById('legalModal');
    const title = document.getElementById('legalTitle');
    const content = document.getElementById('legalContent');
    
    if (legalDocuments[documentType]) {
        title.textContent = legalDocuments[documentType].title;
        content.innerHTML = legalDocuments[documentType].content;
        modal.style.display = 'block';
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
}

// Close legal modal
function closeLegalModal() {
    const modal = document.getElementById('legalModal');
    modal.style.display = 'none';
    
    // Restore body scrolling
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('legalModal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeLegalModal();
            }
        });
    }
});

// Keyboard support - close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('legalModal');
        if (modal && modal.style.display === 'block') {
            closeLegalModal();
        }
    }
});

// ES6 Module Exports
export { openLegalModal, closeLegalModal, legalDocuments };

// Maintain backward compatibility for inline onclick handlers
if (typeof window !== 'undefined') {
    window.openLegalModal = openLegalModal;
    window.closeLegalModal = closeLegalModal;
}