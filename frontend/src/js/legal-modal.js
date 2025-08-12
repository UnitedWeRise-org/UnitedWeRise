// Legal Documents Modal Handler

// Legal document content storage
const legalDocuments = {
    terms: {
        title: "Terms of Service",
        content: `
            <div style="line-height: 1.6; color: #333;">
                <h3>United We Rise - Terms of Service</h3>
                <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>
                
                <h4>1. Acceptance of Terms</h4>
                <p>By accessing or using United We Rise ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Platform.</p>
                
                <h4>2. Description of Service</h4>
                <p>United We Rise is a civic engagement platform that connects users with elected officials, political discussions, and community organizing opportunities. Our mission is to facilitate meaningful political discourse and civic participation.</p>
                
                <h4>3. User Accounts and Registration</h4>
                <p>To access certain features, you must create an account by providing:</p>
                <ul>
                    <li>Valid email address</li>
                    <li>Username and password</li>
                    <li>Optional: Name and address (for representative lookup)</li>
                </ul>
                <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
                
                <h4>4. Acceptable Use</h4>
                <p>You agree to use the Platform for lawful civic engagement only. Prohibited activities include:</p>
                <ul>
                    <li>Posting false, misleading, or defamatory content</li>
                    <li>Harassment, threats, or intimidation of other users</li>
                    <li>Spam, automated posting, or commercial advertising</li>
                    <li>Attempting to interfere with Platform security</li>
                    <li>Violating any applicable laws or regulations</li>
                </ul>
                
                <h4>5. Content and Intellectual Property</h4>
                <p>You retain ownership of content you post, but grant United We Rise a non-exclusive license to display and distribute it on the Platform. You represent that you have the right to post all content you share.</p>
                
                <h4>6. Privacy and Data Protection</h4>
                <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
                
                <h4>7. Platform Availability</h4>
                <p>We strive to maintain Platform availability but do not guarantee uninterrupted service. We may modify or discontinue features at any time.</p>
                
                <h4>8. Third-Party Services</h4>
                <p>The Platform integrates with third-party services including:</p>
                <ul>
                    <li>Google Maps (for address lookup)</li>
                    <li>Google Civic Information API (for representative data)</li>
                    <li>Geocodio API (for enhanced civic data)</li>
                </ul>
                <p>Use of these services is subject to their respective terms.</p>
                
                <h4>9. Disclaimers</h4>
                <p>United We Rise is provided "as is" without warranties of any kind. We do not guarantee the accuracy of political information or representative data displayed on the Platform.</p>
                
                <h4>10. Limitation of Liability</h4>
                <p>United We Rise shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform.</p>
                
                <h4>11. Indemnification</h4>
                <p>You agree to indemnify United We Rise against any claims arising from your use of the Platform or violation of these Terms.</p>
                
                <h4>12. Governing Law</h4>
                <p>These Terms are governed by the laws of the United States and the jurisdiction where United We Rise is headquartered.</p>
                
                <h4>13. Changes to Terms</h4>
                <p>We may modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>
                
                <h4>14. Contact Information</h4>
                <p>For questions about these Terms, please contact us at: legal@unitedwerise.org</p>
            </div>
        `
    },
    privacy: {
        title: "Privacy Policy",
        content: `
            <div style="line-height: 1.6; color: #333;">
                <h3>United We Rise - Privacy Policy</h3>
                <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString()}</p>
                
                <h4>1. Information We Collect</h4>
                
                <h5>Account Information</h5>
                <ul>
                    <li>Email address (required for account creation)</li>
                    <li>Username and password</li>
                    <li>Optional: First name, last name</li>
                    <li>Optional: Address (for representative lookup)</li>
                </ul>
                
                <h5>Content and Activity</h5>
                <ul>
                    <li>Posts, comments, and messages you create</li>
                    <li>Likes, follows, and other interactions</li>
                    <li>Representative searches and civic engagement activities</li>
                </ul>
                
                <h5>Technical Information</h5>
                <ul>
                    <li>IP address and device information</li>
                    <li>Browser type and settings</li>
                    <li>Usage analytics and error logs</li>
                </ul>
                
                <h4>2. How We Use Your Information</h4>
                
                <h5>Core Platform Functions</h5>
                <ul>
                    <li>Providing account access and authentication</li>
                    <li>Displaying your content to other users</li>
                    <li>Finding your elected representatives</li>
                    <li>Personalizing your civic engagement experience</li>
                </ul>
                
                <h5>Communications</h5>
                <ul>
                    <li>Sending account verification emails</li>
                    <li>Notifying you of platform activity</li>
                    <li>Providing customer support</li>
                </ul>
                
                <h5>Platform Improvement</h5>
                <ul>
                    <li>Analytics to improve user experience</li>
                    <li>Security monitoring and fraud prevention</li>
                    <li>Troubleshooting technical issues</li>
                </ul>
                
                <h4>3. Information Sharing</h4>
                
                <h5>Public Information</h5>
                <p>The following information is publicly visible:</p>
                <ul>
                    <li>Username, display name, and profile information</li>
                    <li>Posts and comments you create</li>
                    <li>Follower/following relationships</li>
                    <li>Political profile type (if you're a candidate or official)</li>
                </ul>
                
                <h5>Third-Party Services</h5>
                <p>We share limited information with:</p>
                <ul>
                    <li><strong>Google Maps/Civic API:</strong> Addresses for representative lookup</li>
                    <li><strong>Geocodio API:</strong> Addresses for enhanced civic data</li>
                    <li><strong>hCaptcha:</strong> Security verification data</li>
                    <li><strong>Email Service:</strong> Email addresses for verification</li>
                </ul>
                
                <h5>Legal Requirements</h5>
                <p>We may disclose information when required by law, court order, or to protect the safety of users or the public.</p>
                
                <h4>4. Data Security</h4>
                <p>We implement industry-standard security measures including:</p>
                <ul>
                    <li>Encrypted data transmission (HTTPS/TLS)</li>
                    <li>Secure password hashing (bcrypt)</li>
                    <li>Regular security audits and updates</li>
                    <li>Access controls and authentication</li>
                </ul>
                
                <h4>5. Data Retention</h4>
                <p>We retain your information as long as your account is active or as needed to provide services. You may request account deletion at any time.</p>
                
                <h4>6. Your Rights and Choices</h4>
                
                <h5>Account Control</h5>
                <ul>
                    <li>Update your profile information anytime</li>
                    <li>Delete posts and comments you've created</li>
                    <li>Control who can follow you or message you</li>
                </ul>
                
                <h5>Privacy Settings</h5>
                <ul>
                    <li>Make your profile private or public</li>
                    <li>Control notification preferences</li>
                    <li>Opt out of analytics tracking</li>
                </ul>
                
                <h5>Data Requests</h5>
                <p>You may request:</p>
                <ul>
                    <li>A copy of your personal data</li>
                    <li>Correction of inaccurate information</li>
                    <li>Deletion of your account and data</li>
                </ul>
                
                <h4>7. Children's Privacy</h4>
                <p>United We Rise is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
                
                <h4>8. International Users</h4>
                <p>United We Rise is based in the United States. By using the Platform, you consent to the transfer and processing of your information in the United States.</p>
                
                <h4>9. Changes to This Policy</h4>
                <p>We may update this Privacy Policy periodically. We will notify users of significant changes through the Platform or by email.</p>
                
                <h4>10. Contact Us</h4>
                <p>For questions about this Privacy Policy or to exercise your rights, contact us at:</p>
                <ul>
                    <li>Email: privacy@unitedwerise.org</li>
                    <li>Website: Contact form on unitedwerise.org</li>
                </ul>
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

// Make functions globally available
window.openLegalModal = openLegalModal;
window.closeLegalModal = closeLegalModal;

console.log('Legal modal system loaded');