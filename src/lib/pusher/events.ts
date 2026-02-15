// Pusher event names - shared between client and server

export const CHANNELS = {
  matchmaking: 'matchmaking',
  game: (gameId: string) => `game-${gameId}`,
  user: (userId: string) => `private-user-${userId}`,
};

export const EVENTS = {
  // Matchmaking
  MATCH_FOUND: 'match-found',
  QUEUE_UPDATE: 'queue-update',

  // Game
  MOVE: 'game-move',
  RESIGN: 'game-resign',
  DRAW_OFFER: 'game-draw-offer',
  DRAW_RESPONSE: 'game-draw-response',
  TIMEOUT: 'game-timeout',
  OPPONENT_CONNECTED: 'opponent-connected',
  OPPONENT_DISCONNECTED: 'opponent-disconnected',
};
