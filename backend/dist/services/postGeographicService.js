"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostGeographicService = void 0;
const prisma_1 = require("../lib/prisma");
const geospatial_1 = require("../utils/geospatial");
const logger_1 = require("./logger");
class PostGeographicService {
    /**
     * Generate geographic data for a post based on user's address
     * Returns null if user has no complete address - graceful fallback
     */
    static async generatePostGeographicData(userId) {
        try {
            // Get user's address and cached H3 data
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    streetAddress: true,
                    streetAddress2: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    h3Index: true
                }
            });
            // Graceful fallback: No complete address = no geographic data
            if (!user?.streetAddress || !user?.city || !user?.state || !user?.h3Index) {
                return null;
            }
            // Look up cached Geocodio coordinates from existing district mapping system
            const districtMapping = await prisma_1.prisma.addressDistrictMapping.findFirst({
                where: { h3Index: user.h3Index },
                select: { lat: true, lng: true, confidence: true }
            });
            if (!districtMapping) {
                // No cached coordinates available - graceful fallback
                return null;
            }
            // Generate privacy-displaced coordinates
            const realCoords = {
                lat: districtMapping.lat,
                lng: districtMapping.lng
            };
            const displacedCoords = (0, geospatial_1.generatePrivacyDisplacedCoordinates)(realCoords, 'standard');
            // Calculate H3 indices
            const displacedH3Index = (0, geospatial_1.coordinatesToH3)(displacedCoords);
            const originalH3Index = user.h3Index;
            return {
                h3Index: displacedH3Index,
                latitude: displacedCoords.lat,
                longitude: displacedCoords.lng,
                originalH3Index: originalH3Index,
                privacyDisplaced: true
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Error generating post geographic data');
            return null; // Graceful fallback on any error
        }
    }
    /**
     * Get posts with geographic data for map display
     * Includes intelligent fallback to dummy data when insufficient real posts
     */
    static async getPostsForMap(scope, userH3Index, count = 9) {
        try {
            let whereClause = {
                originalH3Index: { not: null },
                latitude: { not: null },
                longitude: { not: null },
                isDeleted: false,
                feedVisible: true,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            };
            // Add jurisdiction filtering based on scope
            if (scope === 'local' && userH3Index) {
                // Local: Same H3 hex + immediate neighbors
                const neighbors = await this.getH3Neighbors(userH3Index, 1);
                whereClause.originalH3Index = { in: [userH3Index, ...neighbors] };
            }
            else if (scope === 'state' && userH3Index) {
                // State: Larger radius for state-level content
                const neighbors = await this.getH3Neighbors(userH3Index, 3);
                whereClause.originalH3Index = { in: [userH3Index, ...neighbors] };
            }
            // National: No geographic filtering
            const posts = await prisma_1.prisma.post.findMany({
                where: whereClause,
                include: {
                    author: { select: { displayName: true, id: true } }
                },
                orderBy: [
                    { likesCount: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: count
            });
            return posts.map(post => ({
                id: post.id,
                coordinates: [post.longitude, post.latitude], // Privacy-displaced coordinates
                content: post.content,
                author: post.author.displayName || 'Anonymous',
                engagement: post.likesCount,
                createdAt: post.createdAt,
                isRealPost: true,
                jurisdiction: scope
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, scope, count }, 'Error fetching posts for map');
            return []; // Return empty array for graceful fallback to dummy data
        }
    }
    /**
     * Get H3 neighbors for geographic filtering
     */
    static async getH3Neighbors(h3Index, ringSize) {
        try {
            // Import h3-js dynamically to avoid issues
            const { gridRingUnsafe } = await Promise.resolve().then(() => __importStar(require('h3-js')));
            return gridRingUnsafe(h3Index, ringSize);
        }
        catch (error) {
            logger_1.logger.error({ error, h3Index, ringSize }, 'Error getting H3 neighbors');
            return [];
        }
    }
    /**
     * Check if we have sufficient real posts for map display
     */
    static async hasRealPostsForMap(scope, userH3Index) {
        const posts = await this.getPostsForMap(scope, userH3Index, 3);
        return posts.length >= 2; // Need at least 2 real posts to show meaningful content
    }
}
exports.PostGeographicService = PostGeographicService;
//# sourceMappingURL=postGeographicService.js.map