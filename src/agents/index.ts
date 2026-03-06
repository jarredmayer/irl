/**
 * AI Agents
 *
 * Three agents for IRL:
 * 1. Editorial Voice Agent - Generates Yourcast editorial content
 * 2. Image Generation Agent - Generates/selects Tier 2 images
 * 3. Submission Verification Agent - Verifies user-submitted events
 */

export {
  generateEditorial,
  getYourcastEditorial,
  getCachedEditorial,
  clearEditorialCache,
} from './editorial-agent';

export type { YourcastEditorial, EditorialInput } from './prompts/editorial';

export {
  generateEventImage,
  getFallbackImage,
  getCachedImage,
  clearImageCache,
} from './image-agent';

export {
  submitEvent,
  verifySubmission,
  loadSubmissionQueue,
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  clearSubmissionQueue,
} from './submission-agent';

export type {
  EventSubmission,
  VerificationResult,
  SubmissionQueueItem,
} from './submission-agent';
