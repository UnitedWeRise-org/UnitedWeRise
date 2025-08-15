# Feed Algorithm Tuning Guide

## Overview

United We Rise uses a sophisticated **Probability Cloud Algorithm** for content discovery, inspired by quantum electron position probability distributions. This document explains how to tune and optimize the algorithm for better user engagement.

## Algorithm Architecture

### Core Concept: Probability Cloud Sampling
Instead of simply showing the "highest scoring" posts, our algorithm treats content like particles in a probability cloud:
- **Higher scored content** = higher probability of selection
- **Lower scored content** = lower probability, but still possible
- **Result**: Natural variety and discovery while prioritizing relevant content

### 4-Factor Scoring System

Each post receives a score (0-1) in four dimensions:

| Factor | Weight | Description | Formula |
|--------|---------|-------------|---------|
| **Recency** | 35% | How fresh is the content? | `exp(-hours_since_post / 24)` |
| **Similarity** | 25% | How relevant to user's interests? | `cosine_similarity(post_embedding, user_history)` |
| **Social** | 25% | Is it from someone they follow? | `1.0 if followed, 0.1 if not` |
| **Trending** | 15% | How much engagement per hour? | `min(1.0, engagement_score / hours_age)` |

**Final Score**: `(recency × 0.35) + (similarity × 0.25) + (social × 0.25) + (trending × 0.15)`

## Tuning the Algorithm

### 1. Default Weights
```javascript
const defaultWeights = {
    recency: 0.35,    // Prefer newer content (35%)
    similarity: 0.25, // Match user interests (25%)
    social: 0.25,     // Posts from connections (25%)
    trending: 0.15    // Popular content (15%)
};
```

### 2. Custom Weight Examples

#### News-Heavy Feed (emphasize recency and trending)
```json
{
    "recency": 0.45,
    "similarity": 0.15,
    "social": 0.20,
    "trending": 0.20
}
```

#### Discovery Mode (emphasize similarity, reduce social)
```json
{
    "recency": 0.30,
    "similarity": 0.40,
    "social": 0.10,
    "trending": 0.20
}
```

#### Social Mode (emphasize connections)
```json
{
    "recency": 0.25,
    "similarity": 0.20,
    "social": 0.40,
    "trending": 0.15
}
```

#### Viral Content (emphasize trending)
```json
{
    "recency": 0.20,
    "similarity": 0.20,
    "social": 0.20,
    "trending": 0.40
}
```

### 3. API Usage for Custom Weights

```bash
# Default algorithm
curl -H "Authorization: Bearer $TOKEN" \
     "https://api.unitedwerise.org/feed"

# Custom weights
curl -H "Authorization: Bearer $TOKEN" \
     "https://api.unitedwerise.org/feed?weights=%7B%22recency%22%3A0.45%2C%22similarity%22%3A0.15%2C%22social%22%3A0.20%2C%22trending%22%3A0.20%7D"
```

### 4. A/B Testing Framework

```javascript
// Example: Test different weight combinations
const testCases = {
    'control': { recency: 0.35, similarity: 0.25, social: 0.25, trending: 0.15 },
    'news_heavy': { recency: 0.45, similarity: 0.15, social: 0.20, trending: 0.20 },
    'discovery': { recency: 0.30, similarity: 0.40, social: 0.10, trending: 0.20 }
};

// Assign users to test groups and measure engagement
const userGroup = getUserTestGroup(userId);
const weights = testCases[userGroup];
const feed = await generateFeed(userId, 50, weights);
```

## Performance Monitoring

### Algorithm Stats Response
```json
{
    "algorithm": "probability-cloud",
    "weights": { "recency": 0.35, "similarity": 0.25, "social": 0.25, "trending": 0.15 },
    "stats": {
        "candidateCount": 150,        // Total posts considered
        "avgRecencyScore": 0.73,      // Average freshness (higher = newer)
        "avgSimilarityScore": 0.42,   // Average relevance (higher = more relevant)
        "avgSocialScore": 0.31,       // Average social connection (higher = more from followed)
        "avgTrendingScore": 0.18      // Average trending (higher = more viral)
    }
}
```

### Key Metrics to Track

1. **User Engagement**
   - Time spent reading posts
   - Like/comment rates
   - Click-through rates

2. **Content Distribution**
   - Recency distribution (are posts too old?)
   - Social vs discovery ratio
   - Trending content penetration

3. **Algorithm Performance**
   - Feed generation time
   - Content pool utilization
   - Score distribution balance

## Advanced Tuning Strategies

### 1. Time-Based Weight Adjustment
```javascript
// Adjust weights based on time of day
const getTimeBasedWeights = (hour) => {
    if (hour >= 6 && hour <= 9) {
        // Morning: prefer news and trending
        return { recency: 0.40, similarity: 0.20, social: 0.20, trending: 0.20 };
    } else if (hour >= 17 && hour <= 20) {
        // Evening: prefer social content
        return { recency: 0.25, similarity: 0.25, social: 0.35, trending: 0.15 };
    }
    return defaultWeights;
};
```

### 2. User Behavior-Based Adjustment
```javascript
// Adjust based on user's typical engagement patterns
const getUserPersonalizedWeights = async (userId) => {
    const userStats = await getUserEngagementStats(userId);
    
    if (userStats.prefersNewContent) {
        return { ...defaultWeights, recency: 0.40, similarity: 0.20 };
    } else if (userStats.prefersDiscovery) {
        return { ...defaultWeights, similarity: 0.35, social: 0.20 };
    }
    
    return defaultWeights;
};
```

### 3. Content Type Balancing
```javascript
// Ensure diverse content types in feed
const balanceContentTypes = (posts) => {
    const typeDistribution = {
        text: 0.6,      // 60% text posts
        image: 0.25,    // 25% posts with images
        link: 0.15      // 15% link posts
    };
    
    return rebalanceByContentType(posts, typeDistribution);
};
```

## Best Practices

### 1. Weight Constraints
- All weights must sum to 1.0
- No individual weight should exceed 0.6 (avoid over-optimization)
- Minimum weight should be 0.05 (maintain some influence)

### 2. Testing Guidelines
- Test one weight change at a time
- Run A/B tests for at least 7 days
- Monitor both short-term and long-term engagement
- Consider different user segments (new vs established users)

### 3. Monitoring Alerts
Set up alerts for:
- Average feed generation time > 500ms
- Any factor score consistently < 0.1 or > 0.9
- User engagement drop > 10% after algorithm changes

## Future Enhancements

### Planned Features
1. **Geographic Relevance**: Add location-based scoring for local political content
2. **Seasonal Adjustments**: Automatically adjust during election periods
3. **User Feedback Learning**: Incorporate explicit user feedback (hide/show more like this)
4. **Diversity Scoring**: Prevent echo chambers with ideological diversity metrics

### Research Areas
1. **Reinforcement Learning**: Train weights based on user actions
2. **Multi-Armed Bandit**: Dynamic weight optimization per user
3. **Graph Neural Networks**: Leverage social network structure for better recommendations

---

**Last Updated**: August 10, 2025  
**Algorithm Version**: v2.2 (Probability Cloud)  
**Next Review**: August 17, 2025