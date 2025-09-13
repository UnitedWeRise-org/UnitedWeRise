/**
 * UNIFIED POST CREATION SYSTEM
 * Created: September 6, 2025
 * Purpose: Centralize all post creation logic with proper tagging
 */

/**
 * Base function that handles all post creation API calls
 * All other posting functions should call this
 */
async function createPostWithTag(content, tags, options = {}) {
    try {
        // Validate inputs
        if (!content || content.trim().length === 0) {
            throw new Error('Post content is required');
        }

        // Prepare request body - preserve existing media attachment logic
        const requestBody = {
            content: content.trim(),
            tags: tags,
            ...options // May include: imageUrl, mediaId, volunteerEmail, candidateId, etc.
        };

        // Make API call using existing apiCall function
        const response = await apiCall('/posts', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        if (response.ok && response.data && response.data.post) {
            return {
                success: true,
                post: response.data.post
            };
        } else {
            const errorMsg = response.data?.error || response.data?.message || 'Failed to create post';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Post creation error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create post'
        };
    }
}

/**
 * Create a public post (appears in main feeds)
 */
async function createPostPublic(content, options = {}) {
    return createPostWithTag(content, ["Public Post"], options);
}

/**
 * Create a volunteer inquiry (only visible to admins)
 */
async function createPostVolunteer(content, email, options = {}) {
    // Handle both logged-in and anonymous volunteer submissions
    const postContent = window.currentUser 
        ? content 
        : `Contact: ${email}\n\n${content}`;
        
    return createPostWithTag(
        postContent, 
        ["Volunteer Post"], 
        { ...options, volunteerEmail: email }
    );
}

/**
 * Create a candidate post (appears in candidate sections and main feed)
 */
async function createPostCandidate(content, options = {}) {
    return createPostWithTag(
        content,
        ["Candidate Post"],
        options
    );
}

/**
 * Create an official announcement (for elected officials)
 */
async function createPostOfficial(content, options = {}) {
    return createPostWithTag(content, ["Official Post"], options);
}

// ============================================
// POST DISPLAY HELPER FUNCTIONS
// ============================================

/**
 * These functions help identify what type of post we're dealing with
 * when displaying them in the UI
 */

function isPublicPost(post) {
    return post.tags && post.tags.includes("Public Post");
}

function isVolunteerPost(post) {
    return post.tags && post.tags.includes("Volunteer Post");
}

function isCandidatePost(post) {
    return post.tags && post.tags.includes("Candidate Post");
}

function isOfficialPost(post) {
    return post.tags && post.tags.includes("Official Post");
}

/**
 * Get display badge/label for post type
 */
function getPostTypeLabel(post) {
    if (isCandidatePost(post)) return "Candidate";
    if (isOfficialPost(post)) return "Official";
    if (isVolunteerPost(post)) return "Volunteer Inquiry";
    return null; // Regular public posts don't need labels
}

// Make functions available globally for backward compatibility
window.createPostPublic = createPostPublic;
window.createPostVolunteer = createPostVolunteer;
window.createPostCandidate = createPostCandidate;
window.createPostOfficial = createPostOfficial;
window.isPublicPost = isPublicPost;
window.isVolunteerPost = isVolunteerPost;
window.isCandidatePost = isCandidatePost;
window.isOfficialPost = isOfficialPost;
window.getPostTypeLabel = getPostTypeLabel;