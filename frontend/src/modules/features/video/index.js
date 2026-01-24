/**
 * Video Module - Short-form video feature ("Snippets")
 *
 * Components:
 * - VideoUploader: Upload videos with progress tracking
 * - VideoPlayer: HLS.js based adaptive player
 * - ReelsFeed: TikTok-style vertical video feed
 * - VideoCard: Video thumbnail card for feed display
 * - SnippetsDashboard: User's video management interface
 * - SnippetCreatorModal: Modal for creating new snippets
 *
 * @module features/video
 */

export { VideoUploader } from './VideoUploader.js';
export { VideoPlayer } from './VideoPlayer.js';
export { ReelsFeed } from './ReelsFeed.js';
export { VideoCard, videoCard } from './VideoCard.js';
export { SnippetsDashboard } from './SnippetsDashboard.js';
export { SnippetCreatorModal } from './SnippetCreatorModal.js';

// Re-export default for convenience
import VideoUploader from './VideoUploader.js';
import VideoPlayer from './VideoPlayer.js';
import ReelsFeed from './ReelsFeed.js';
import VideoCard from './VideoCard.js';
import SnippetsDashboard from './SnippetsDashboard.js';
import SnippetCreatorModal from './SnippetCreatorModal.js';

export default {
    VideoUploader,
    VideoPlayer,
    ReelsFeed,
    VideoCard,
    SnippetsDashboard,
    SnippetCreatorModal
};
