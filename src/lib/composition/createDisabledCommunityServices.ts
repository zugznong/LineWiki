import { DisabledNoteRepository } from '../adapters/repositories/DisabledNoteRepository';
import { DisabledDiscussionRepository } from '../adapters/repositories/DisabledDiscussionRepository';
import { DisabledStatsRepository } from '../adapters/repositories/DisabledStatsRepository';

const notesRepository = new DisabledNoteRepository();
const discussionRepository = new DisabledDiscussionRepository();
const statsRepository = new DisabledStatsRepository();

export function createDisabledCommunityServices() {
  return {
    notesRepository,
    discussionRepository,
    statsRepository
  };
}
