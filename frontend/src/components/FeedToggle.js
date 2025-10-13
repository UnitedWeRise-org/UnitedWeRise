/**
 * Feed Toggle Component
 * Manages switching between "Discover" and "Following" feeds
 */

import { getApiBaseUrl } from '../utils/environment.js';
import { apiCall } from '../js/api-compatibility-shim.js';

export class FeedToggle {
    constructor() {
        this.currentFeed = 'discover'; // Default to discover feed
        this.caches = {
            following: [],
            discover: [],
            saved: []
        };
        this.showNewUserBanner = false;
        this.showEmptyFollowingState = false;

        this.init();
    }

    async init() {
        // Determine smart default based on user's follows and content
        await this.determineDefaultFeed();

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', `Feed toggle initialized with ${this.currentFeed} feed`);
        }
    }

    /**
     * Determine default feed selection
     * - Always defaults to Discover unless user has saved preference
     * - Per user specification: Discover should be the default feed
     */
    async determineDefaultFeed() {
        try {
            // Check saved preference first
            const saved = localStorage.getItem('preferredFeed');
            if (saved && (saved === 'discover' || saved === 'following')) {
                this.currentFeed = saved;
                return;
            }

            // Default to Discover (per user requirement)
            this.currentFeed = 'discover';

            // Check if user is new (no follows) to show helpful banner
            if (typeof apiCall === 'function') {
                const followResponse = await apiCall('/auth/me', { method: 'GET' });
                const followingCount = followResponse?.data?.data?.followingCount || 0;

                if (followingCount === 0) {
                    this.showNewUserBanner = true;
                }
            }
        } catch (error) {
            console.error('Error determining default feed:', error);
            // Fallback to discover on error
            this.currentFeed = 'discover';
        }
    }

    /**
     * Render the toggle UI and insert it into the page
     * @param {string} containerId - ID of container to insert toggle into
     */
    render(containerId = 'myFeedPosts') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Feed toggle: container ${containerId} not found`);
            return;
        }

        // Check if controls already exist
        if (document.querySelector('.feed-controls-wrapper')) {
            console.log('Feed controls already exist, updating state');
            this.updateToggleState();
            this.updateUnreadBadge();
            return;
        }

        const toggleHtml = `
            <div class="feed-controls-wrapper">
                <!-- 4-Item Toggle (original style) - NOW ON TOP -->
                <div class="feed-toggle-container">
                    <div class="feed-toggle">
                        <button class="feed-toggle-btn ${this.currentFeed === 'discover' ? 'active' : ''}" data-feed-type="discover">
                            <span class="feed-toggle-icon">🔥</span>
                            <span class="feed-toggle-label">Discover</span>
                        </button>
                        <button class="feed-toggle-btn ${this.currentFeed === 'following' ? 'active' : ''}" data-feed-type="following">
                            <span class="feed-toggle-icon">👥</span>
                            <span class="feed-toggle-label">Following</span>
                            <span class="unread-badge" style="display: none;"></span>
                        </button>
                        <button class="feed-toggle-btn ${this.currentFeed === 'saved' ? 'active' : ''}" data-feed-type="saved">
                            <span class="feed-toggle-icon">🔖</span>
                            <span class="feed-toggle-label">Saved</span>
                        </button>
                        <button class="feed-toggle-btn disabled" data-action="filters-coming-soon">
                            <span class="feed-toggle-icon">⚙️</span>
                            <span class="feed-toggle-label">Filters</span>
                            <span class="tooltip-filters">Coming Soon - Save your favorite filters!</span>
                        </button>
                    </div>
                </div>

                <!-- New Post Button - NOW ON BOTTOM -->
                <button class="new-post-standalone-btn" data-action="new-post">
                    <span class="new-post-icon">➕</span>
                    <span class="new-post-label">New Post</span>
                </button>

                <!-- Inline Composer Mount Point (hidden by default) -->
                <div id="inline-composer-mount" style="display: none;"></div>
            </div>
        `;

        // Insert at the top of the feed container
        container.insertAdjacentHTML('afterbegin', toggleHtml);

        // Render banners if needed
        if (this.showNewUserBanner) {
            this.renderNewUserBanner(container);
        } else if (this.showEmptyFollowingState) {
            this.renderEmptyFollowingBanner(container);
        }

        // Attach event listeners
        this.attachEventListeners();

        // Setup swipe gestures on mobile
        this.attachSwipeListeners();

        // Update unread badge
        this.updateUnreadBadge();

        // Setup scroll behavior for auto-hide/show
        this.setupScrollBehavior();

        // Show swipe hint on mobile (first time only)
        if (this.isMobile()) {
            this.showSwipeHint();
            this.showSwipeTooltip();
        }
    }

    /**
     * Render banner for new users with no follows
     */
    renderNewUserBanner(container) {
        const bannerHtml = `
            <div class="feed-banner new-user-banner" style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">👋</div>
                <div style="font-weight: 600; color: #2e7d32; margin-bottom: 4px;">Welcome to UnitedWeRise!</div>
                <div style="color: #555; font-size: 14px;">
                    Start by following people to see their posts in your Following feed.
                </div>
            </div>
        `;
        const controlsWrapper = container.querySelector('.feed-controls-wrapper');
        if (controlsWrapper) {
            controlsWrapper.insertAdjacentHTML('afterend', bannerHtml);
        }
    }

    /**
     * Render banner when user follows people but feed is empty
     */
    renderEmptyFollowingBanner(container) {
        const bannerHtml = `
            <div class="feed-banner empty-following-banner" style="background: #fff3e0; border: 1px solid #ff9800; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
                <div style="font-weight: 600; color: #e65100; margin-bottom: 4px;">Following feed is quiet</div>
                <div style="color: #555; font-size: 14px;">
                    The people you follow haven't posted recently. Check back later or explore Discover!
                </div>
            </div>
        `;
        const controlsWrapper = container.querySelector('.feed-controls-wrapper');
        if (controlsWrapper) {
            controlsWrapper.insertAdjacentHTML('afterend', bannerHtml);
        }
    }

    attachEventListeners() {
        // Feed type buttons
        document.querySelectorAll('.feed-toggle-btn[data-feed-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const feedType = btn.dataset.feedType;
                this.switchFeed(feedType);
            });
        });

        // New Post button (stand-alone) - show inline composer
        const newPostBtn = document.querySelector('.new-post-standalone-btn');
        if (newPostBtn) {
            newPostBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showInlineComposer();
            });
        }

        // Filters placeholder (disabled, just tooltip)
        const filtersBtn = document.querySelector('.feed-toggle-btn.disabled');
        if (filtersBtn) {
            filtersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Tooltip shows on hover/tap via CSS
            });
        }
    }

    showInlineComposer() {
        const btn = document.querySelector('.new-post-standalone-btn');
        const mount = document.querySelector('#inline-composer-mount');

        if (!btn || !mount) {
            console.error('FeedToggle: New Post button or composer mount not found');
            return;
        }

        // Hide New Post button
        btn.style.display = 'none';

        // Show composer mount
        mount.style.display = 'block';

        // Create simple inline composer HTML
        mount.innerHTML = `
            <div class="inline-composer-content" style="width: 100%; box-sizing: border-box;">
                <textarea id="inlinePostContent" placeholder="What's on your mind?" style="width: 100%; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; box-sizing: border-box; margin-bottom: 8px;"></textarea>
                <input type="file" id="inlineFileInput" accept="image/*,video/*" multiple style="display: none;" />
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div style="display: flex; gap: 8px;">
                        <button id="inlineCancelBtn" style="background: #6c757d; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; border: none;">Cancel</button>
                        <button id="inlineAttachBtn" style="background: #f0ede5; color: #4b5c09; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; border: 1px solid #4b5c09; font-weight: 600;">📎 Attach</button>
                    </div>
                    <button id="inlinePostBtn" style="background: #4b5c09; color: white; padding: 8px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px;">Post</button>
                </div>
                <div id="inlineFilePreview" style="margin-top: 8px; display: none;"></div>
            </div>
        `;

        // Attach event listeners
        const textarea = mount.querySelector('#inlinePostContent');
        const cancelBtn = mount.querySelector('#inlineCancelBtn');
        const attachBtn = mount.querySelector('#inlineAttachBtn');
        const fileInput = mount.querySelector('#inlineFileInput');
        const filePreview = mount.querySelector('#inlineFilePreview');
        const postBtn = mount.querySelector('#inlinePostBtn');

        // Store selected files
        let selectedFiles = [];

        // Focus textarea
        if (textarea) {
            textarea.focus();
        }

        // Attach button - trigger file input
        if (attachBtn && fileInput) {
            attachBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // File input change - show preview
        if (fileInput && filePreview) {
            fileInput.addEventListener('change', (e) => {
                selectedFiles = Array.from(e.target.files);
                console.log(`📎 Files selected: ${selectedFiles.length}`, selectedFiles.map(f => f.name));
                console.log('📎 File preview element:', filePreview);
                console.log('📎 File preview current display:', filePreview.style.display);

                if (selectedFiles.length > 0) {
                    // Create file list with image thumbnails for images
                    const fileList = selectedFiles.map(f => {
                        if (f.type.startsWith('image/')) {
                            const url = URL.createObjectURL(f);
                            return `<div style="font-size: 12px; color: #555; margin-left: 8px; display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                                <img src="${url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" />
                                <span>• ${f.name}</span>
                            </div>`;
                        } else {
                            return `<div style="font-size: 12px; color: #555; margin-left: 8px; margin-top: 4px;">• ${f.name}</div>`;
                        }
                    }).join('');

                    filePreview.innerHTML = `
                        <div style="background: #e8f4ea; border: 2px solid #4b5c09; padding: 12px; border-radius: 8px; font-size: 13px; color: #4b5c09; margin-top: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong>📎 ${selectedFiles.length} file(s) attached</strong>
                                <button id="clearFilesBtn" style="background: #dc3545; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">✕ Remove</button>
                            </div>
                            ${fileList}
                        </div>
                    `;

                    // Force display block with multiple methods
                    filePreview.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; margin-top: 8px;';
                    filePreview.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important; margin-top: 8px;');

                    console.log('📎 File preview display set to:', filePreview.style.display);
                    console.log('📎 File preview HTML:', filePreview.innerHTML.substring(0, 100));
                    console.log('📎 File preview offsetHeight:', filePreview.offsetHeight);
                    console.log('📎 File preview parent:', filePreview.parentElement);

                    // Clear files button
                    const clearBtn = filePreview.querySelector('#clearFilesBtn');
                    if (clearBtn) {
                        clearBtn.addEventListener('click', () => {
                            selectedFiles = [];
                            fileInput.value = '';
                            filePreview.style.display = 'none';
                            filePreview.innerHTML = '';
                            console.log('📎 Files cleared');
                        });
                    }
                } else {
                    filePreview.style.display = 'none';
                    filePreview.innerHTML = '';
                }
            });
        } else {
            console.error('📎 File input or preview element not found:', { fileInput: !!fileInput, filePreview: !!filePreview });
        }

        // Cancel button - hide composer, show New Post button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                mount.style.display = 'none';
                mount.innerHTML = '';
                btn.style.display = 'flex';
            });
        }

        // Post button - create post
        if (postBtn) {
            postBtn.addEventListener('click', async () => {
                const content = textarea?.value?.trim();

                if (!content) {
                    alert('Please enter some content for your post');
                    return;
                }

                // Disable button during posting
                postBtn.disabled = true;
                postBtn.textContent = 'Posting...';

                try {
                    // Use UnifiedPostCreator if available (handles two-step upload)
                    let postResult;
                    if (window.unifiedPostCreator && typeof window.unifiedPostCreator.createPost === 'function') {
                        console.log('📝 Using UnifiedPostCreator.createPost()');
                        postResult = await window.unifiedPostCreator.createPost({
                            content: content,
                            mediaFiles: selectedFiles.length > 0 ? selectedFiles : null,
                            type: 'post'
                        });
                    } else {
                        // Manual two-step process: 1) Upload media, 2) Create post
                        let mediaIds = [];

                        if (selectedFiles.length > 0) {
                            console.log('📸 Step 1: Uploading media files...');

                            // Check if uploadMediaFiles is available
                            if (typeof window.uploadMediaFiles !== 'function') {
                                throw new Error('Media upload system not available');
                            }

                            const uploadResult = await window.uploadMediaFiles(
                                selectedFiles,
                                'POST_MEDIA',
                                'PERSONAL'
                            );

                            console.log('📸 Upload result:', uploadResult);

                            if (!uploadResult.ok || !uploadResult.data?.photos) {
                                throw new Error(uploadResult.error || 'Media upload failed');
                            }

                            mediaIds = uploadResult.data.photos.map(photo => photo.id);
                            console.log('✅ Media uploaded, IDs:', mediaIds);
                        }

                        // Step 2: Create post with content and mediaIds
                        console.log('📝 Step 2: Creating post with content and mediaIds...');
                        postResult = await apiCall('/posts', {
                            method: 'POST',
                            body: JSON.stringify({
                                content,
                                mediaIds: mediaIds.length > 0 ? mediaIds : undefined
                            }),
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }

                    console.log('📝 Post result:', postResult);

                    // Success - hide composer, show button
                    mount.style.display = 'none';
                    mount.innerHTML = '';
                    btn.style.display = 'flex';

                    // INSTANT GRATIFICATION: Prepend the newly created post directly
                    // This is the OLD WORKING approach - don't reload feed, just insert the post
                    console.log('📝 Prepending new post to feed (instant gratification)...');

                    // Extract post from response (handle different response formats)
                    let post = null;
                    if (postResult.data && postResult.data.post) {
                        post = postResult.data.post;
                    } else if (postResult.post) {
                        post = postResult.post;
                    } else if (postResult.data && postResult.data.id) {
                        post = postResult.data;
                    }

                    if (post && window.currentUser) {
                        this.prependNewPost(post, window.currentUser);
                    } else {
                        // Fallback to reload if post object not available
                        console.warn('⚠️ Post object not available, falling back to feed reload');
                        if (this.caches && this.caches[this.currentFeed]) {
                            this.caches[this.currentFeed] = [];
                        }
                        await this.loadFeed(this.currentFeed, true);
                    }
                } catch (error) {
                    console.error('Failed to create post:', error);
                    alert('Failed to create post. Please try again.');
                    // Re-enable button
                    postBtn.disabled = false;
                    postBtn.textContent = 'Post';
                }
            });
        }
    }

    updateToggleState() {
        // Update button states
        document.querySelectorAll('.feed-toggle-btn[data-feed-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.feedType === this.currentFeed);
        });
    }

    async switchFeed(feedType) {
        if (this.currentFeed === feedType) {
            console.log(`Already on ${feedType} feed`);
            return;
        }

        // Validate feedType
        if (!['discover', 'following', 'saved'].includes(feedType)) {
            console.error(`Invalid feed type: ${feedType}`);
            return;
        }

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', `Switching feed from ${this.currentFeed} to ${feedType}`);
        }

        this.currentFeed = feedType;
        localStorage.setItem('preferredFeed', feedType);

        // Reset unread count when switching to Following
        if (feedType === 'following') {
            this.resetUnreadCount();
        }

        // Update UI
        this.updateToggleState();

        // Load feed
        await this.loadFeed(feedType);
    }

    async loadFeed(feedType, bypassCache = false) {
        // Show loading state
        const container = document.getElementById('myFeedPosts');
        if (!container) return;

        // Get all post elements (not the controls wrapper or banners)
        const postElements = Array.from(container.children).filter(el =>
            !el.classList.contains('feed-controls-wrapper') &&
            !el.classList.contains('feed-banner') &&
            !el.classList.contains('feed-loading')
        );

        // Fade out old posts with animation
        if (postElements.length > 0) {
            postElements.forEach(el => el.classList.add('fade-out'));
            // Wait for fade out animation
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Remove old posts
        postElements.forEach(el => el.remove());

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'feed-loading';
        loadingDiv.style.cssText = 'text-align: center; padding: 2rem; color: #666;';
        loadingDiv.innerHTML = `<p>Loading ${feedType} feed...</p>`;
        container.appendChild(loadingDiv);

        try {
            let posts;
            if (feedType === 'following') {
                posts = await this.loadFollowingFeed(bypassCache);
            } else if (feedType === 'saved') {
                posts = await this.loadSavedFeed(bypassCache);
            } else {
                posts = await this.loadDiscoverFeed(bypassCache);
            }

            // Remove loading indicator
            loadingDiv.remove();

            // Render posts
            this.renderPosts(posts, feedType);

            // Fade in new posts
            setTimeout(() => {
                const newPostElements = container.querySelectorAll('.post-item');
                newPostElements.forEach(el => {
                    el.classList.add('fade-in');
                    // Remove class after animation completes
                    setTimeout(() => el.classList.remove('fade-in'), 200);
                });
            }, 50);
        } catch (error) {
            console.error('Feed load error:', error);
            loadingDiv.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p>Unable to load feed. Please try again.</p>
                    <button onclick="window.feedToggle.loadFeed('${feedType}')" class="btn">Retry</button>
                </div>
            `;
        }
    }

    async loadFollowingFeed(bypassCache = false) {
        console.log('Loading following feed...', bypassCache ? '(bypassing cache)' : '');

        // Check cache first (unless bypassing)
        if (!bypassCache && this.caches.following.length > 0) {
            console.log('Using cached following feed');
            return this.caches.following;
        }

        // Safety check: Ensure apiCall is available
        if (typeof apiCall !== 'function') {
            console.error('FeedToggle: apiCall not available, cannot load Following feed');
            return [];
        }

        // Backend endpoint is /feed/following
        // Add timestamp to bust performance cache when needed
        const url = bypassCache
            ? `/feed/following?limit=15&_=${Date.now()}`
            : '/feed/following?limit=15';

        const response = await apiCall(url, {
            method: 'GET'
        });

        console.log('Following feed response:', response);
        console.log('📊 Response structure check:', {
            hasDataPosts: !!response?.data?.posts,
            dataPostsLength: response?.data?.posts?.length,
        });

        // Handle different response formats
        let posts = null;
        if (response && response.posts) {
            console.log('✅ Found posts at response.posts');
            posts = response.posts;
        } else if (response && response.data && response.data.posts) {
            console.log('✅ Found posts at response.data.posts');
            posts = response.data.posts;
        } else if (response && response.ok && response.data && response.data.posts) {
            console.log('✅ Found posts at response.ok.data.posts');
            posts = response.data.posts;
        } else {
            console.error('❌ Could not find posts in following feed response');
        }

        if (posts && Array.isArray(posts)) {
            console.log(`✅ Returning ${posts.length} posts for following feed`);
            this.caches.following = posts;
            return posts;
        }

        console.warn('⚠️ No posts found in following feed, returning empty array');
        return [];
    }

    async loadDiscoverFeed(bypassCache = false) {
        console.log('Loading discover feed...', bypassCache ? '(bypassing cache)' : '');

        // Check cache first (unless bypassing)
        if (!bypassCache && this.caches.discover.length > 0) {
            console.log('Using cached discover feed');
            return this.caches.discover;
        }

        // Safety check: Ensure apiCall is available
        if (typeof apiCall !== 'function') {
            console.error('FeedToggle: apiCall not available, cannot load Discover feed');
            return [];
        }

        // Backend endpoint is /feed/ (default discover)
        // Add timestamp to bust performance cache when needed
        const url = bypassCache
            ? `/feed/?limit=15&_=${Date.now()}`
            : '/feed/?limit=15';

        const response = await apiCall(url, {
            method: 'GET'
        });

        console.log('Discover feed response:', response);
        console.log('📊 Response structure check:', {
            hasResponse: !!response,
            hasData: !!response?.data,
            hasOk: !!response?.ok,
            hasPosts: !!response?.posts,
            hasDataPosts: !!response?.data?.posts,
            dataKeys: response?.data ? Object.keys(response.data) : [],
            dataPostsLength: response?.data?.posts?.length,
        });

        // Handle different response formats
        let posts = null;
        if (response && response.posts) {
            console.log('✅ Found posts at response.posts');
            posts = response.posts;
        } else if (response && response.data && response.data.posts) {
            console.log('✅ Found posts at response.data.posts');
            posts = response.data.posts;
        } else if (response && response.ok && response.data && response.data.posts) {
            console.log('✅ Found posts at response.ok.data.posts');
            posts = response.data.posts;
        } else {
            console.error('❌ Could not find posts in response. Response structure:', response);
        }

        if (posts && Array.isArray(posts)) {
            console.log(`✅ Returning ${posts.length} posts for discover feed`);
            this.caches.discover = posts;
            return posts;
        }

        console.warn('⚠️ No posts found, returning empty array');
        return [];
    }

    async loadSavedFeed(bypassCache = false) {
        console.log('Loading saved feed...', bypassCache ? '(bypassing cache)' : '');

        // Check cache first (unless bypassing)
        if (!bypassCache && this.caches.saved && this.caches.saved.length > 0) {
            console.log('Using cached saved feed');
            return this.caches.saved;
        }

        // Safety check: Ensure apiCall is available
        if (typeof apiCall !== 'function') {
            console.error('FeedToggle: apiCall not available, cannot load Saved feed');
            return [];
        }

        // Backend endpoint is /posts/saved
        // Add timestamp to bust performance cache when needed
        const url = bypassCache
            ? `/posts/saved?limit=50&_=${Date.now()}`
            : '/posts/saved?limit=50';

        const response = await apiCall(url, {
            method: 'GET'
        });

        console.log('Saved feed response:', response);
        console.log('📊 Response structure check:', {
            hasDataPosts: !!response?.data?.posts,
            dataPostsLength: response?.data?.posts?.length,
        });

        // Handle different response formats
        let posts = null;
        if (response && response.posts) {
            console.log('✅ Found posts at response.posts');
            posts = response.posts;
        } else if (response && response.data && response.data.posts) {
            console.log('✅ Found posts at response.data.posts');
            posts = response.data.posts;
        } else if (response && response.ok && response.data && response.data.posts) {
            console.log('✅ Found posts at response.ok.data.posts');
            posts = response.data.posts;
        } else {
            console.error('❌ Could not find posts in saved feed response');
        }

        if (posts && Array.isArray(posts)) {
            console.log(`✅ Returning ${posts.length} posts for saved feed`);
            this.caches.saved = posts;
            return posts;
        }

        return [];
    }

    renderPosts(posts, feedType) {
        console.log('🎨 renderPosts called:', {
            feedType,
            postsReceived: !!posts,
            postsLength: posts?.length,
            postsType: Array.isArray(posts) ? 'array' : typeof posts,
            firstPost: posts?.[0]?.id
        });

        const container = document.getElementById('myFeedPosts');
        if (!container) {
            console.error('❌ Container #myFeedPosts not found');
            return;
        }

        if (!posts || posts.length === 0) {
            console.warn('⚠️ No posts to render, showing empty state');

            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = 'text-align: center; padding: 2rem; color: #666;';

            if (feedType === 'following') {
                emptyDiv.innerHTML = `
                    <p>No posts from users you follow yet.</p>
                    <p><small>Try the Discover feed to find interesting people to follow!</small></p>
                `;
            } else if (feedType === 'saved') {
                emptyDiv.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 16px;">🔖</div>
                    <p style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No saved posts yet</p>
                    <p><small>Save posts by clicking the bookmark icon to read them later.</small></p>
                `;
            } else {
                emptyDiv.innerHTML = `
                    <p>No posts available right now.</p>
                    <p><small>Check back later for new content!</small></p>
                `;
            }

            container.appendChild(emptyDiv);
            return;
        }

        console.log(`✅ Rendering ${posts.length} posts for ${this.currentFeed} feed`);

        // CRITICAL FIX: Preserve feed controls before rendering
        // renderPostsList sets innerHTML which wipes out controls
        const feedControls = container.querySelector('.feed-controls-wrapper');
        const feedBanners = Array.from(container.querySelectorAll('.feed-banner'));
        console.log('💾 Preserving controls:', {
            hasControls: !!feedControls,
            bannerCount: feedBanners.length
        });

        // Use UnifiedPostRenderer if available (PRIORITY 1: renderPostsList for consistency)
        if (window.unifiedPostRenderer) {
            console.log('✅ Using window.unifiedPostRenderer.renderPostsList()');
            try {
                window.unifiedPostRenderer.renderPostsList(posts, 'myFeedPosts', { context: 'feed' });
                console.log('✅ Posts rendered successfully');

                // CRITICAL FIX: Restore feed controls at the top
                if (feedControls) {
                    console.log('✅ Restoring feed controls');
                    container.insertBefore(feedControls, container.firstChild);
                }
                // Restore banners after controls
                if (feedBanners.length > 0) {
                    console.log(`✅ Restoring ${feedBanners.length} banners`);
                    const insertAfter = feedControls || container.firstChild;
                    feedBanners.forEach(banner => {
                        if (insertAfter && insertAfter.nextSibling) {
                            container.insertBefore(banner, insertAfter.nextSibling);
                        } else {
                            container.appendChild(banner);
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error rendering with UnifiedPostRenderer:', error);
                this.renderPostsFallback(posts, container);
            }
        } else if (window.displayMyFeedPosts) {
            console.log('⚠️ Using legacy window.displayMyFeedPosts()');
            // Fallback to existing feed display function
            window.displayMyFeedPosts(posts, false); // false = replace mode (not append)
        } else {
            console.warn('⚠️ No post renderer available, using fallback');
            this.renderPostsFallback(posts, container);
        }
    }

    renderPostsFallback(posts, container) {
        console.log('Using fallback post renderer');

        posts.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post-item';
            postDiv.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: white;';

            postDiv.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <strong>${post.author?.firstName || post.author?.username || 'Anonymous'}</strong>
                    <span style="color: #666; margin-left: 0.5rem; font-size: 0.9rem;">
                        ${post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                    </span>
                </div>
                <div style="margin-bottom: 1rem;">${post.content || ''}</div>
                ${post.photos && post.photos.length > 0 ? `
                    <div style="margin-bottom: 1rem;">
                        ${post.photos.map(photo => `
                            <img src="${photo.url}" alt="Post image"
                                 style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 0.5rem; display: block;">
                        `).join('')}
                    </div>
                ` : ''}
                <div style="color: #666; font-size: 0.9rem;">
                    👍 ${post.likesCount || 0} likes • 💬 ${post.commentsCount || 0} comments
                </div>
            `;

            container.appendChild(postDiv);
        });
    }

    /**
     * Prepend newly created post to feed for instant gratification
     * Based on old working implementation from my-feed.js
     *
     * @param {Object} post - Post object from creation API
     * @param {Object} user - Current user object
     */
    prependNewPost(post, user) {
        const container = document.getElementById('myFeedPosts');
        if (!container) {
            console.error('❌ Cannot prepend post - container not found');
            return;
        }

        console.log('📝 Prepending new post to feed:', {
            id: post.id,
            hasPhotos: !!(post.photos?.length),
            photoCount: post.photos?.length || 0
        });

        // Format the post with user data for display
        const postWithUser = {
            ...post,
            author: {
                id: user.id,
                username: user.username,
                firstName: user.firstName || user.username,
                lastName: user.lastName || '',
                avatar: user.avatar || null,
                verified: user.verified || false
            },
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            isLiked: false,
            createdAt: post.createdAt || new Date().toISOString(),
            photos: post.photos || []
        };

        try {
            // Find where to insert (after feed controls and banners)
            const feedControls = container.querySelector('.feed-controls-wrapper');
            const banners = container.querySelectorAll('.feed-banner');
            let insertPoint = null;

            if (banners.length > 0) {
                // Insert after last banner
                insertPoint = banners[banners.length - 1];
            } else if (feedControls) {
                // Insert after feed controls
                insertPoint = feedControls;
            }

            // PRIORITY 1: Use UnifiedPostRenderer for consistent display
            if (window.unifiedPostRenderer) {
                const postHtml = window.unifiedPostRenderer.render(postWithUser, { context: 'feed' });

                if (insertPoint) {
                    insertPoint.insertAdjacentHTML('afterend', postHtml);
                } else {
                    container.insertAdjacentHTML('afterbegin', postHtml);
                }

                console.log('✅ Post prepended using UnifiedPostRenderer');
            } else if (window.postComponent) {
                // Fallback to PostComponent
                const postHtml = window.postComponent.renderPost(postWithUser, {
                    showActions: true,
                    showComments: true,
                    inFeed: true
                });

                if (insertPoint) {
                    insertPoint.insertAdjacentHTML('afterend', postHtml);
                } else {
                    container.insertAdjacentHTML('afterbegin', postHtml);
                }

                console.log('✅ Post prepended using PostComponent (fallback)');
            } else {
                // Ultimate fallback - use renderPostsFallback
                console.warn('⚠️ No renderer available, using fallback');
                this.renderPostsFallback([postWithUser], container);
            }

            // Clear cache so next reload gets fresh data
            if (this.caches && this.caches[this.currentFeed]) {
                this.caches[this.currentFeed] = [];
            }
        } catch (error) {
            console.error('❌ Error prepending post:', error);
            // On error, try full feed reload
            this.loadFeed(this.currentFeed, true);
        }
    }

    /**
     * Get unread count for Following feed
     */
    async getUnreadCount() {
        try {
            // Safety check: Ensure apiCall is available
            if (typeof apiCall !== 'function') {
                return 0;
            }

            // Get last view timestamp
            const lastView = localStorage.getItem('followingLastView');
            if (!lastView) return 0;

            // Fetch Following feed preview
            const response = await apiCall('/feed/following?limit=100', { method: 'GET' });
            const posts = response?.data?.posts || response?.posts || [];

            // Count posts newer than last view
            const unreadCount = posts.filter(post =>
                new Date(post.createdAt) > new Date(lastView)
            ).length;

            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('FeedToggle', `Unread count: ${unreadCount}`);
            }

            return Math.min(unreadCount, 99); // Max 99
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Update unread badge on Following button
     */
    async updateUnreadBadge() {
        const followingBtn = document.querySelector('.feed-toggle-btn[data-feed-type="following"]');
        if (!followingBtn) return;

        let badge = followingBtn.querySelector('.unread-badge');

        // If we're on Following feed, hide badge
        if (this.currentFeed === 'following') {
            if (badge) badge.style.display = 'none';
            return;
        }

        // Get unread count
        const count = await this.getUnreadCount();

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge feed-toggle-badge';
                followingBtn.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            if (badge) badge.style.display = 'none';
        }
    }

    /**
     * Reset unread count by saving current timestamp
     */
    resetUnreadCount() {
        localStorage.setItem('followingLastView', new Date().toISOString());
        this.updateUnreadBadge();
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', 'Reset unread count');
        }
    }

    /**
     * Attach swipe gesture listeners for mobile
     */
    attachSwipeListeners() {
        const container = document.getElementById('myFeedPosts');
        if (!container) return;

        let touchStartX = 0;
        let touchEndX = 0;
        let isDragging = false;

        container.addEventListener('touchstart', (e) => {
            // Only track swipes that start on the feed content area, not on buttons
            const target = e.target;
            if (target.closest('.feed-toggle-btn') || target.closest('button')) {
                return;
            }

            touchStartX = e.changedTouches[0].screenX;
            isDragging = true;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            touchEndX = e.changedTouches[0].screenX;
        }, { passive: true });

        container.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            const swipeDistance = touchEndX - touchStartX;
            const minSwipeDistance = 50;

            if (Math.abs(swipeDistance) < minSwipeDistance) return;

            // Swipe right → Discover, Swipe left → Following
            if (swipeDistance > 0 && this.currentFeed === 'following') {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('FeedToggle', 'Swipe right detected: switching to Discover');
                }
                this.switchFeed('discover');
            } else if (swipeDistance < 0 && this.currentFeed === 'discover') {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('FeedToggle', 'Swipe left detected: switching to Following');
                }
                this.switchFeed('following');
            }
        }, { passive: true });
    }

    /**
     * Setup scroll behavior for auto-hide/show toggle
     * Hides controls when scrolling UP, shows when scrolling DOWN
     */
    setupScrollBehavior() {
        const controlsWrapper = document.querySelector('.feed-controls-wrapper');
        const feedContainer = document.getElementById('myFeedPosts');

        if (!controlsWrapper || !feedContainer) return;

        let lastScrollTop = 0;
        let ticking = false;

        const handleScroll = () => {
            const currentScrollTop = feedContainer.scrollTop;

            // Determine scroll direction
            if (currentScrollTop > lastScrollTop && currentScrollTop > 50) {
                // Scrolling DOWN (reading newer content) - show controls
                controlsWrapper.classList.remove('hidden');
            } else if (currentScrollTop < lastScrollTop) {
                // Scrolling UP (reading older content) - hide controls
                controlsWrapper.classList.add('hidden');
            }

            lastScrollTop = currentScrollTop;
            ticking = false;
        };

        // Use requestAnimationFrame for smooth performance
        // Listen to scroll on the feed container, not window
        feedContainer.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(handleScroll);
                ticking = true;
            }
        }, { passive: true });

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('FeedToggle', 'Scroll behavior initialized on #myFeedPosts');
        }
    }

    /**
     * Show wobble animation hint for swipe gesture
     */
    showSwipeHint() {
        // Check if already shown
        const hasSeenAnimation = localStorage.getItem('hasSeenSwipeAnimation');
        if (hasSeenAnimation) return;

        // Wait 2 seconds after load
        setTimeout(() => {
            const toggle = document.querySelector('.feed-toggle');
            if (!toggle) return;

            // Add wobble class
            toggle.classList.add('wobble-hint');

            // Remove after animation and mark as seen
            setTimeout(() => {
                toggle.classList.remove('wobble-hint');
                localStorage.setItem('hasSeenSwipeAnimation', 'true');
            }, 1000);
        }, 2000);
    }

    /**
     * Show tooltip explaining swipe gesture
     */
    showSwipeTooltip() {
        const shownCount = parseInt(localStorage.getItem('swipeHintShownCount') || '0');
        if (shownCount >= 2) return;

        setTimeout(() => {
            const controlsWrapper = document.querySelector('.feed-controls-wrapper');
            if (!controlsWrapper) return;

            // Make container position relative for tooltip positioning
            controlsWrapper.style.position = 'relative';

            const tooltip = document.createElement('div');
            tooltip.className = 'swipe-hint-tooltip';
            tooltip.innerHTML = '💡 Swipe to switch feeds';
            controlsWrapper.appendChild(tooltip);

            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                tooltip.remove();
                localStorage.setItem('swipeHintShownCount', String(shownCount + 1));
            }, 3000);
        }, 3000); // Show after wobble animation
    }

    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= 767 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }

    clearCache(feedType = null) {
        if (feedType) {
            this.caches[feedType] = [];
        } else {
            this.caches.following = [];
            this.caches.discover = [];
            this.caches.saved = [];
        }
    }

    getCurrentFeed() {
        return this.currentFeed;
    }
}

// Create global instance
window.feedToggle = new FeedToggle();

// Export for module use
export default FeedToggle;

console.log('✅ FeedToggle component loaded');
