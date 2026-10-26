import { GameItem } from '../types';

const ABANDONWARE_IDS = new Set([
  'unidentified-manhunt-2',
  'unidentified-zoo-tycoon-2-complete-edition',
]);

export function isAbandonware(game: GameItem): boolean {
  return game.isAbandonware ?? ABANDONWARE_IDS.has(game.id);
}

export function hasCommunityPort(game: GameItem): boolean {
  if (typeof game.hasCommunityPort === 'boolean') return game.hasCommunityPort;
  const projectName = (game.projectTitle || '').trim();
  const hasPlaceholderProject = /^(proyecto no catalogado|sin proyecto comunitario|no catalogado)$/i.test(projectName);
  return !hasPlaceholderProject && game.method !== 'UNKNOWN';
}
