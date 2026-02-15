// Zustand Store for Online (PvP) Game State
/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from 'zustand';
import {
  GameState, Move, PieceColor, GameResult, EndReason,
  BoardState, MatchmakingStatus, ConnectionStatus,
} from '@/types';
import { applyMove } from '@/lib/chess/applyMove';
import { squareToAlgebraic, algebraicToSquare } from '@/lib/chess/board';
import { getPusherClient } from '@/lib/pusher/client';
import { EVENTS } from '@/lib/pusher/events';
import type { Channel } from 'pusher-js';

interface OpponentInfo {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  rating: number;
}

interface OnlineGameStore {
  // Matchmaking state
  matchmakingStatus: MatchmakingStatus;
  queueId: string | null;
  searchStartTime: number | null;

  // Game state
  gameState: GameState | null;
  gameId: string | null;
  playerColor: PieceColor;
  opponent: OpponentInfo | null;

  // Timers
  whiteTime: number;
  blackTime: number;

  // Game status
  isGameOver: boolean;
  result: GameResult;
  endReason: EndReason | null;
  tokensWon: number;

  // UI state
  lastMove: Move | null;
  connectionStatus: ConnectionStatus;
  drawOfferReceived: boolean;
  drawOfferSent: boolean;

  // Pusher
  gameChannel: Channel | null;
  matchmakingChannel: Channel | null;

  // Actions
  startMatchmaking: (userId: string) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  pollMatchmaking: () => Promise<void>;

  initOnlineGame: (
    gameId: string,
    playerColor: PieceColor,
    opponent: OpponentInfo,
    board: BoardState | null,
    whiteKnightPositions: number[],
    blackKnightPositions: number[],
    userId: string,
  ) => void;

  makeMove: (move: Move) => Promise<void>;
  receiveOpponentMove: (data: any) => void;
  resign: () => Promise<void>;
  offerDraw: () => Promise<void>;
  respondToDraw: (accept: boolean) => Promise<void>;
  handleTimeout: (color: PieceColor) => Promise<void>;
  updateTimer: (color: PieceColor, time: number) => void;

  cleanup: () => void;
  resetStore: () => void;
}

const initialState = {
  matchmakingStatus: 'idle' as MatchmakingStatus,
  queueId: null,
  searchStartTime: null,
  gameState: null,
  gameId: null,
  playerColor: 'white' as PieceColor,
  opponent: null,
  whiteTime: 600,
  blackTime: 600,
  isGameOver: false,
  result: null as GameResult,
  endReason: null,
  tokensWon: 0,
  lastMove: null,
  connectionStatus: 'disconnected' as ConnectionStatus,
  drawOfferReceived: false,
  drawOfferSent: false,
  gameChannel: null,
  matchmakingChannel: null,
};

export const useOnlineGameStore = create<OnlineGameStore>((set, get) => ({
  ...initialState,

  // Start matchmaking
  startMatchmaking: async (userId: string) => {
    set({ matchmakingStatus: 'searching', searchStartTime: Date.now() });

    try {
      // Subscribe to matchmaking channel for real-time match notifications
      const pusher = getPusherClient();
      const channel = pusher.subscribe('matchmaking');

      channel.bind(EVENTS.MATCH_FOUND, (data: any) => {
        if (data.targetUserId === userId) {
          set({ matchmakingStatus: 'matched' });

          // Initialize game with match data
          get().initOnlineGame(
            data.gameId,
            data.playerColor,
            data.opponent,
            null,
            [],
            [],
            userId,
          );
        }
      });

      set({ matchmakingChannel: channel });

      // Call API to join queue
      const response = await fetch('/api/matchmaking', { method: 'POST' });
      const result = await response.json();

      if (result.success && result.data.matched) {
        // Instant match found
        set({ matchmakingStatus: 'matched' });
        get().initOnlineGame(
          result.data.gameId,
          result.data.playerColor,
          result.data.opponent,
          null,
          [],
          [],
          userId,
        );
      } else if (result.success) {
        set({ queueId: result.data.queueId });
      } else {
        set({ matchmakingStatus: 'error' });
      }
    } catch (error) {
      console.error('Matchmaking error:', error);
      set({ matchmakingStatus: 'error' });
    }
  },

  // Cancel matchmaking
  cancelMatchmaking: async () => {
    try {
      await fetch('/api/matchmaking', { method: 'DELETE' });
    } catch {
      // Ignore errors
    }

    const { matchmakingChannel } = get();
    if (matchmakingChannel) {
      matchmakingChannel.unbind_all();
      const pusher = getPusherClient();
      pusher.unsubscribe('matchmaking');
    }

    set({
      matchmakingStatus: 'idle',
      queueId: null,
      searchStartTime: null,
      matchmakingChannel: null,
    });
  },

  // Poll matchmaking status
  pollMatchmaking: async () => {
    try {
      const response = await fetch('/api/matchmaking');
      const result = await response.json();

      if (result.success && result.data.matched) {
        set({ matchmakingStatus: 'matched' });
        return;
      }

      if (result.success && result.data.status === 'expired') {
        set({ matchmakingStatus: 'idle', queueId: null, searchStartTime: null });
      }
    } catch {
      // Ignore polling errors
    }
  },

  // Initialize online game
  initOnlineGame: async (
    gameId: string,
    playerColor: PieceColor,
    opponent: OpponentInfo,
    board: BoardState | null,
    whiteKnightPositions: number[],
    blackKnightPositions: number[],
    userId: string,
  ) => {
    // Fetch game data from API if board is null
    let gameBoard = board;
    let wkp = whiteKnightPositions;
    let bkp = blackKnightPositions;

    if (!gameBoard) {
      try {
        const response = await fetch(`/api/online/game?gameId=${gameId}`);
        const result = await response.json();
        if (result.success) {
          gameBoard = result.data.board;
          wkp = result.data.whiteKnightPositions;
          bkp = result.data.blackKnightPositions;
        }
      } catch {
        // Fallback to creating a new board
        const { getRandomKnightPositions, createInitialBoard: createBoard } = await import('@/lib/chess/board');
        wkp = getRandomKnightPositions();
        bkp = getRandomKnightPositions();
        gameBoard = createBoard(wkp, bkp);
      }
    }

    const gameState: GameState = {
      board: gameBoard!,
      turn: 'white',
      moveHistory: [],
      whiteKnightPositions: wkp,
      blackKnightPositions: bkp,
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
    };

    // Subscribe to game channel
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameId}`);

    // Listen for opponent moves
    channel.bind(EVENTS.MOVE, (data: any) => {
      if (data.playerId !== userId) {
        get().receiveOpponentMove(data);
      }
    });

    // Listen for resign
    channel.bind(EVENTS.RESIGN, (data: any) => {
      const { playerColor: myColor } = get();
      const isPlayerWin = data.resignedBy !== myColor;

      set({
        isGameOver: true,
        result: data.result,
        endReason: 'resignation',
        tokensWon: isPlayerWin ? 2 : 0,
      });
    });

    // Listen for draw offers
    channel.bind(EVENTS.DRAW_OFFER, (data: any) => {
      const { playerColor: myColor } = get();
      if (data.offeredBy !== myColor) {
        set({ drawOfferReceived: true });
      }
    });

    // Listen for draw responses
    channel.bind(EVENTS.DRAW_RESPONSE, (data: any) => {
      if (data.accepted) {
        set({
          isGameOver: true,
          result: 'draw',
          endReason: 'draw_agreement',
          tokensWon: 1,
          drawOfferReceived: false,
          drawOfferSent: false,
        });
      } else {
        set({ drawOfferSent: false, drawOfferReceived: false });
      }
    });

    // Unsubscribe from matchmaking
    const { matchmakingChannel } = get();
    if (matchmakingChannel) {
      matchmakingChannel.unbind_all();
      pusher.unsubscribe('matchmaking');
    }

    set({
      gameState,
      gameId,
      playerColor,
      opponent,
      whiteTime: 600,
      blackTime: 600,
      isGameOver: false,
      result: null,
      endReason: null,
      tokensWon: 0,
      lastMove: null,
      connectionStatus: 'connected',
      drawOfferReceived: false,
      drawOfferSent: false,
      gameChannel: channel,
      matchmakingStatus: 'idle',
      matchmakingChannel: null,
      queueId: null,
      searchStartTime: null,
    });
  },

  // Make a move (player's own move)
  makeMove: async (move: Move) => {
    const { gameState, playerColor, gameId, isGameOver } = get();
    if (!gameState || isGameOver || !gameId) return;
    if (gameState.turn !== playerColor) return;

    // Apply move locally
    const newState = applyMove(gameState, move);

    set({
      gameState: newState,
      lastMove: move,
    });

    // Send move to server
    const from = squareToAlgebraic(move.from);
    const to = squareToAlgebraic(move.to);

    try {
      await fetch('/api/online/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          moveNumber: newState.fullMoveNumber,
          from,
          to,
          piece: move.piece.type,
          captured: move.captured?.type || null,
          promotion: move.promotion || null,
          notation: move.notation || `${from}-${to}`,
          isCheck: newState.isCheck,
          isCheckmate: newState.isCheckmate,
          isStalemate: newState.isStalemate,
          isDraw: newState.isDraw,
          isCastling: move.isCastling || null,
          isEnPassant: move.isEnPassant || false,
          boardState: newState.board,
          turn: newState.turn,
          whiteTimeRemaining: Math.round(get().whiteTime * 1000),
          blackTimeRemaining: Math.round(get().blackTime * 1000),
        }),
      });
    } catch (error) {
      console.error('Error sending move:', error);
    }

    // Check for game over
    if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
      const result = newState.isCheckmate
        ? (newState.turn === 'white' ? 'black_wins' : 'white_wins')
        : 'draw';
      const isPlayerWin =
        (result === 'white_wins' && playerColor === 'white') ||
        (result === 'black_wins' && playerColor === 'black');

      set({
        isGameOver: true,
        result,
        endReason: newState.isCheckmate ? 'checkmate' : 'stalemate',
        tokensWon: isPlayerWin ? 2 : (result === 'draw' ? 1 : 0),
      });

      // Report result to server
      try {
        await fetch('/api/online/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            result,
            endReason: newState.isCheckmate ? 'checkmate' : 'stalemate',
          }),
        });
      } catch {
        // Ignore
      }
    }
  },

  // Receive opponent's move via Pusher
  receiveOpponentMove: (data: any) => {
    const { gameState, playerColor, gameId } = get();
    if (!gameState || !gameId) return;

    // Reconstruct the move
    const from = algebraicToSquare(data.from);
    const to = algebraicToSquare(data.to);
    if (!from || !to) return;

    const piece = gameState.board[from.rank][from.file];
    if (!piece) return;

    const captured = gameState.board[to.rank][to.file] || undefined;

    const move: Move = {
      from,
      to,
      piece,
      captured,
      promotion: data.promotion || undefined,
      isCheck: data.isCheck,
      isCheckmate: data.isCheckmate,
      isCastling: data.isCastling || undefined,
      isEnPassant: data.isEnPassant || false,
      notation: data.notation,
    };

    const newState = applyMove(gameState, move);

    // Update timers from server data
    const whiteTime = data.whiteTimeRemaining ? data.whiteTimeRemaining / 1000 : get().whiteTime;
    const blackTime = data.blackTimeRemaining ? data.blackTimeRemaining / 1000 : get().blackTime;

    set({
      gameState: newState,
      lastMove: move,
      whiteTime,
      blackTime,
    });

    // Check for game over
    if (newState.isCheckmate || newState.isStalemate || newState.isDraw) {
      const result = newState.isCheckmate
        ? (newState.turn === 'white' ? 'black_wins' : 'white_wins')
        : 'draw';
      const isPlayerWin =
        (result === 'white_wins' && playerColor === 'white') ||
        (result === 'black_wins' && playerColor === 'black');

      set({
        isGameOver: true,
        result,
        endReason: newState.isCheckmate ? 'checkmate' : 'stalemate',
        tokensWon: isPlayerWin ? 2 : (result === 'draw' ? 1 : 0),
      });
    }
  },

  // Resign
  resign: async () => {
    const { playerColor, gameId } = get();
    if (!gameId) return;

    set({
      isGameOver: true,
      result: playerColor === 'white' ? 'black_wins' : 'white_wins',
      endReason: 'resignation',
      tokensWon: 0,
    });

    try {
      await fetch('/api/online/resign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch {
      // Ignore
    }
  },

  // Offer draw
  offerDraw: async () => {
    const { gameId } = get();
    if (!gameId) return;

    set({ drawOfferSent: true });

    try {
      await fetch('/api/online/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, action: 'offer' }),
      });
    } catch {
      set({ drawOfferSent: false });
    }
  },

  // Respond to draw offer
  respondToDraw: async (accept: boolean) => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      await fetch('/api/online/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, action: accept ? 'accept' : 'decline' }),
      });

      if (accept) {
        set({
          isGameOver: true,
          result: 'draw',
          endReason: 'draw_agreement',
          tokensWon: 1,
          drawOfferReceived: false,
        });
      } else {
        set({ drawOfferReceived: false });
      }
    } catch {
      // Ignore
    }
  },

  // Handle timeout
  handleTimeout: async (color: PieceColor) => {
    const { playerColor, gameId } = get();
    if (!gameId) return;

    const isPlayerTimeout = color === playerColor;
    const result = color === 'white' ? 'black_wins' : 'white_wins';

    set({
      isGameOver: true,
      result,
      endReason: 'timeout',
      tokensWon: isPlayerTimeout ? 0 : 2,
    });

    try {
      await fetch('/api/online/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          result,
          endReason: 'timeout',
        }),
      });
    } catch {
      // Ignore
    }
  },

  // Update timer
  updateTimer: (color: PieceColor, time: number) => {
    if (color === 'white') {
      set({ whiteTime: time });
    } else {
      set({ blackTime: time });
    }
  },

  // Cleanup Pusher subscriptions
  cleanup: () => {
    const { gameChannel, matchmakingChannel } = get();
    const pusher = getPusherClient();

    if (gameChannel) {
      gameChannel.unbind_all();
      pusher.unsubscribe(gameChannel.name);
    }

    if (matchmakingChannel) {
      matchmakingChannel.unbind_all();
      pusher.unsubscribe('matchmaking');
    }

    set({
      gameChannel: null,
      matchmakingChannel: null,
      connectionStatus: 'disconnected',
    });
  },

  // Reset store
  resetStore: () => {
    get().cleanup();
    set(initialState);
  },
}));
