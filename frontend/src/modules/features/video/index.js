/**
 * Video Module - Short-form video feature
 *
 * Components:
 * - VideoUploader: Upload videos with progress tracking
 * - VideoPlayer: HLS.js based adaptive player
 * - ReelsFeed: TikTok-style vertical video feed
 *
 * @module features/video
 */

export { VideoUploader } from './VideoUploader.js';
export { VideoPlayer } from './VideoPlayer.js';
export { ReelsFeed } from './ReelsFeed.js';

// Re-export default for convenience
import VideoUploader from './VideoUploader.js';
import VideoPlayer from './VideoPlayer.js';
import ReelsFeed from './ReelsFeed.js';

export default {
    VideoUploader,
    VideoPlayer,
    ReelsFeed
};
