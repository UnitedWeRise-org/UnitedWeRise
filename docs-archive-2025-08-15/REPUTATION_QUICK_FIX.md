# Reputation System Quick Fix

## 🚨 Current Issue
Azure Static Web Apps deployment is delayed. The browser is still trying to load old reputation files that cause MIME type errors.

## ⚡ Immediate Browser Console Fix

**Copy and paste this into your browser console on www.unitedwerise.org:**

```javascript
// Remove old script tags that are causing errors
document.querySelectorAll('script[src*="reputation"]').forEach(script => script.remove());
document.querySelectorAll('link[href*="reputation"]').forEach(link => link.remove());

// Load reputation system inline
(function() {
    console.log('🏆 Loading reputation system (manual fix)...');
    
    // Add CSS styles
    const css = `
        .reputation-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 500;
            padding: 2px 6px;
            border-radius: 12px;
            margin-left: 4px;
            line-height: 1.2;
            vertical-align: middle;
            white-space: nowrap;
            transition: opacity 0.2s ease;
            cursor: help;
        }
        .reputation-badge-green {
            background-color: #22c55e;
            color: white;
            border: 1px solid #16a34a;
        }
        .reputation-badge-yellow {
            background-color: #eab308;
            color: white;
            border: 1px solid #ca8a04;
        }
        .reputation-badge-brown {
            background-color: #a16207;
            color: white;
            border: 1px solid #92400e;
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    
    // Add reputation functions
    function getReputationBadge(score) {
        if (score >= 95) {
            return { color: 'green', text: 'Trusted', class: 'reputation-badge-green', show: true };
        } else if (score >= 50) {
            return { color: null, text: null, class: null, show: false };
        } else if (score >= 30) {
            return { color: 'yellow', text: 'Mixed', class: 'reputation-badge-yellow', show: true };
        } else {
            return { color: 'brown', text: 'Low Trust', class: 'reputation-badge-brown', show: true };
        }
    }
    
    function createReputationBadgeElement(score) {
        const badge = getReputationBadge(score);
        if (!badge.show) return null;
        
        const element = document.createElement('span');
        element.className = `reputation-badge ${badge.class}`;
        element.textContent = badge.text;
        element.title = `Reputation: ${score}/100`;
        return element;
    }
    
    function addReputationBadgeToPost(postElement, reputation) {
        if (!postElement || reputation === undefined) return;
        
        const authorElement = postElement.querySelector('.post-author-name, .post-author, .comment-author');
        if (authorElement && !authorElement.querySelector('.reputation-badge')) {
            const badgeElement = createReputationBadgeElement(reputation);
            if (badgeElement) {
                authorElement.appendChild(badgeElement);
            }
        }
    }
    
    // Global reputation functions
    window.ReputationBadges = {
        getReputationBadge,
        createReputationBadgeElement,
        addReputationBadgeToPost,
        updateAllPostBadges: function() {
            document.querySelectorAll('[data-author-reputation]').forEach(post => {
                const reputation = parseInt(post.getAttribute('data-author-reputation'));
                if (reputation) {
                    addReputationBadgeToPost(post, reputation);
                }
            });
        },
        updateProfileBadge: function(reputation) {
            const profileElement = document.querySelector('.my-profile .profile-header, .user-profile .profile-header');
            if (profileElement && !profileElement.querySelector('.reputation-badge')) {
                const badgeElement = createReputationBadgeElement(reputation);
                if (badgeElement) {
                    profileElement.appendChild(badgeElement);
                }
            }
        }
    };
    
    // Auto-update existing posts
    window.ReputationBadges.updateAllPostBadges();
    
    console.log('✅ Reputation system loaded manually!');
})();
```

## 🔍 Test the Fix

After running the script above, test it:

```javascript
// Test creating a badge
window.ReputationBadges.createReputationBadgeElement(95)

// Test updating posts  
window.ReputationBadges.updateAllPostBadges()

// Add a test badge to current user
window.ReputationBadges.updateProfileBadge(85)
```

## 🎯 Expected Result

- ✅ No more MIME type errors in console
- ✅ Green "Trusted" badges appear for high reputation users (95+)
- ✅ Yellow "Mixed" badges for moderate reputation (30-49)  
- ✅ Brown "Low Trust" badges for low reputation (0-29)
- ✅ No badges for normal users (50-94)

## ⏰ When Deployment is Fixed

You'll know the deployment worked when:
1. **Page title** shows version info
2. **Console shows**: `🏆 Reputation badge system loaded (inline)`
3. **No MIME type errors** for reputation files

The manual fix above replicates exactly what the deployment will do automatically.