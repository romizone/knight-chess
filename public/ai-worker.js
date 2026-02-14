// Self-contained AI Worker for Knight Chess
// All chess logic is inlined to avoid module resolution issues in Web Workers

// ============================================================
// CONSTANTS
// ============================================================

const BOARD_CONFIG = { FILES: 8, RANKS: 9 };

const PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
};

const SIMPLE_PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000,
};

const AI_CONFIG = {
    easy: {
        searchDepth: 2,
        blunderChance: 0.35,
        thinkTime: { min: 500, max: 1500 },
    },
    medium: {
        searchDepth: 3,
        blunderChance: 0.15,
        thinkTime: { min: 1000, max: 2500 },
    },
    difficult: {
        searchDepth: 5,
        blunderChance: 0.03,
        thinkTime: { min: 1500, max: 4000 },
    },
};

const KNIGHT_POSITION_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 25, 25, 15, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
];

const PAWN_POSITION_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

// Direction vectors
const KNIGHT_MOVES = [
    { file: 1, rank: 2 }, { file: 2, rank: 1 },
    { file: 2, rank: -1 }, { file: 1, rank: -2 },
    { file: -1, rank: -2 }, { file: -2, rank: -1 },
    { file: -2, rank: 1 }, { file: -1, rank: 2 },
];

const KING_MOVES = [
    { file: 0, rank: 1 }, { file: 1, rank: 1 },
    { file: 1, rank: 0 }, { file: 1, rank: -1 },
    { file: 0, rank: -1 }, { file: -1, rank: -1 },
    { file: -1, rank: 0 }, { file: -1, rank: 1 },
];

const ROOK_DIRECTIONS = [
    { file: 0, rank: 1 }, { file: 1, rank: 0 },
    { file: 0, rank: -1 }, { file: -1, rank: 0 },
];

const BISHOP_DIRECTIONS = [
    { file: 1, rank: 1 }, { file: 1, rank: -1 },
    { file: -1, rank: -1 }, { file: -1, rank: 1 },
];

const QUEEN_DIRECTIONS = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS];

// ============================================================
// BOARD UTILITIES
// ============================================================

function isValidSquare(square) {
    return square.file >= 0 && square.file < BOARD_CONFIG.FILES &&
           square.rank >= 0 && square.rank < BOARD_CONFIG.RANKS;
}

function getPieceAt(board, square) {
    if (!isValidSquare(square)) return null;
    return board[square.rank][square.file];
}

function findKing(board, color) {
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece && piece.type === 'king' && piece.color === color) {
                return { file, rank };
            }
        }
    }
    return null;
}

function getPiecesByColor(board, color) {
    const pieces = [];
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (piece && piece.color === color) {
                pieces.push({ piece, square: { file, rank } });
            }
        }
    }
    return pieces;
}

function cloneBoard(board) {
    return board.map(row => row.map(piece => piece ? { ...piece } : null));
}

function cloneGameState(state) {
    return {
        ...state,
        board: cloneBoard(state.board),
        moveHistory: [...state.moveHistory],
        whiteKnightPositions: [...state.whiteKnightPositions],
        blackKnightPositions: [...state.blackKnightPositions],
        castlingRights: {
            white: { ...state.castlingRights.white },
            black: { ...state.castlingRights.black },
        },
        enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    };
}

// ============================================================
// MOVE GENERATION
// ============================================================

function isSquareAttacked(board, square, byColor) {
    // Knight attacks
    for (const delta of KNIGHT_MOVES) {
        const from = { file: square.file + delta.file, rank: square.rank + delta.rank };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece && piece.type === 'knight' && piece.color === byColor) return true;
        }
    }

    // Pawn attacks
    const pawnDirection = byColor === 'white' ? -1 : 1;
    for (const fileDelta of [-1, 1]) {
        const from = { file: square.file + fileDelta, rank: square.rank + pawnDirection };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece && piece.type === 'pawn' && piece.color === byColor) return true;
        }
    }

    // King attacks
    for (const delta of KING_MOVES) {
        const from = { file: square.file + delta.file, rank: square.rank + delta.rank };
        if (isValidSquare(from)) {
            const piece = getPieceAt(board, from);
            if (piece && piece.type === 'king' && piece.color === byColor) return true;
        }
    }

    // Rook/Queen attacks
    for (const dir of ROOK_DIRECTIONS) {
        let current = { file: square.file + dir.file, rank: square.rank + dir.rank };
        while (isValidSquare(current)) {
            const piece = getPieceAt(board, current);
            if (piece) {
                if (piece.color === byColor && (piece.type === 'rook' || piece.type === 'queen')) return true;
                break;
            }
            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }

    // Bishop/Queen attacks
    for (const dir of BISHOP_DIRECTIONS) {
        let current = { file: square.file + dir.file, rank: square.rank + dir.rank };
        while (isValidSquare(current)) {
            const piece = getPieceAt(board, current);
            if (piece) {
                if (piece.color === byColor && (piece.type === 'bishop' || piece.type === 'queen')) return true;
                break;
            }
            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }

    return false;
}

function isInCheck(board, color) {
    const kingSquare = findKing(board, color);
    if (!kingSquare) return false;
    return isSquareAttacked(board, kingSquare, color === 'white' ? 'black' : 'white');
}

function createMove(from, to, piece, captured, promotion) {
    return { from, to, piece, captured, promotion };
}

function generatePawnMoves(state, from, piece) {
    const moves = [];
    const direction = piece.color === 'white' ? 1 : -1;
    const startRank = piece.color === 'white' ? 1 : 7;
    const promotionRank = piece.color === 'white' ? 8 : 0;

    const oneStep = { file: from.file, rank: from.rank + direction };
    if (isValidSquare(oneStep) && !getPieceAt(state.board, oneStep)) {
        if (oneStep.rank === promotionRank) {
            for (const promo of ['queen', 'rook', 'bishop', 'knight']) {
                moves.push(createMove(from, oneStep, piece, undefined, promo));
            }
        } else {
            moves.push(createMove(from, oneStep, piece));
            if (from.rank === startRank) {
                const twoStep = { file: from.file, rank: from.rank + 2 * direction };
                if (isValidSquare(twoStep) && !getPieceAt(state.board, twoStep)) {
                    moves.push(createMove(from, twoStep, piece));
                }
            }
        }
    }

    for (const fileDelta of [-1, 1]) {
        const captureSquare = { file: from.file + fileDelta, rank: from.rank + direction };
        if (!isValidSquare(captureSquare)) continue;

        const target = getPieceAt(state.board, captureSquare);
        if (target && target.color !== piece.color) {
            if (captureSquare.rank === promotionRank) {
                for (const promo of ['queen', 'rook', 'bishop', 'knight']) {
                    moves.push(createMove(from, captureSquare, piece, target, promo));
                }
            } else {
                moves.push(createMove(from, captureSquare, piece, target));
            }
        }

        if (state.enPassantTarget &&
            captureSquare.file === state.enPassantTarget.file &&
            captureSquare.rank === state.enPassantTarget.rank) {
            const capturedPawn = { type: 'pawn', color: piece.color === 'white' ? 'black' : 'white' };
            const move = createMove(from, captureSquare, piece, capturedPawn);
            move.isEnPassant = true;
            moves.push(move);
        }
    }

    return moves;
}

function generateKnightMoves(board, from, piece) {
    const moves = [];
    for (const delta of KNIGHT_MOVES) {
        const to = { file: from.file + delta.file, rank: from.rank + delta.rank };
        if (!isValidSquare(to)) continue;
        const target = getPieceAt(board, to);
        if (!target || target.color !== piece.color) {
            moves.push(createMove(from, to, piece, target || undefined));
        }
    }
    return moves;
}

function generateSlidingMoves(board, from, piece, directions) {
    const moves = [];
    for (const dir of directions) {
        let current = { file: from.file + dir.file, rank: from.rank + dir.rank };
        while (isValidSquare(current)) {
            const target = getPieceAt(board, current);
            if (!target) {
                moves.push(createMove(from, current, piece));
            } else {
                if (target.color !== piece.color) {
                    moves.push(createMove(from, current, piece, target));
                }
                break;
            }
            current = { file: current.file + dir.file, rank: current.rank + dir.rank };
        }
    }
    return moves;
}

function generateKingMoves(state, from, piece) {
    const moves = [];
    for (const delta of KING_MOVES) {
        const to = { file: from.file + delta.file, rank: from.rank + delta.rank };
        if (!isValidSquare(to)) continue;
        const target = getPieceAt(state.board, to);
        if (!target || target.color !== piece.color) {
            moves.push(createMove(from, to, piece, target || undefined));
        }
    }

    const castlingRights = state.castlingRights[piece.color];
    const rank = piece.color === 'white' ? 0 : 8;
    const oppColor = piece.color === 'white' ? 'black' : 'white';

    if (castlingRights.kingside && from.rank === rank && from.file === 4) {
        const f = { file: 5, rank };
        const g = { file: 6, rank };
        const rookSquare = { file: 7, rank };
        const rook = getPieceAt(state.board, rookSquare);
        if (!getPieceAt(state.board, f) && !getPieceAt(state.board, g) &&
            rook && rook.type === 'rook' && rook.color === piece.color &&
            !isSquareAttacked(state.board, from, oppColor) &&
            !isSquareAttacked(state.board, f, oppColor) &&
            !isSquareAttacked(state.board, g, oppColor)) {
            const move = createMove(from, g, piece);
            move.isCastling = 'kingside';
            moves.push(move);
        }
    }

    if (castlingRights.queenside && from.rank === rank && from.file === 4) {
        const d = { file: 3, rank };
        const c = { file: 2, rank };
        const b = { file: 1, rank };
        const rookSquare = { file: 0, rank };
        const rook = getPieceAt(state.board, rookSquare);
        if (!getPieceAt(state.board, d) && !getPieceAt(state.board, c) && !getPieceAt(state.board, b) &&
            rook && rook.type === 'rook' && rook.color === piece.color &&
            !isSquareAttacked(state.board, from, oppColor) &&
            !isSquareAttacked(state.board, d, oppColor) &&
            !isSquareAttacked(state.board, c, oppColor)) {
            const move = createMove(from, c, piece);
            move.isCastling = 'queenside';
            moves.push(move);
        }
    }

    return moves;
}

function generatePseudoLegalMoves(state, square) {
    const piece = getPieceAt(state.board, square);
    if (!piece) return [];

    switch (piece.type) {
        case 'pawn': return generatePawnMoves(state, square, piece);
        case 'knight': return generateKnightMoves(state.board, square, piece);
        case 'bishop': return generateSlidingMoves(state.board, square, piece, BISHOP_DIRECTIONS);
        case 'rook': return generateSlidingMoves(state.board, square, piece, ROOK_DIRECTIONS);
        case 'queen': return generateSlidingMoves(state.board, square, piece, QUEEN_DIRECTIONS);
        case 'king': return generateKingMoves(state, square, piece);
        default: return [];
    }
}

function makeTemporaryMove(board, move) {
    const newBoard = cloneBoard(board);
    newBoard[move.to.rank][move.to.file] = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;
    newBoard[move.from.rank][move.from.file] = null;

    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            newBoard[rank][5] = newBoard[rank][7];
            newBoard[rank][7] = null;
        } else {
            newBoard[rank][3] = newBoard[rank][0];
            newBoard[rank][0] = null;
        }
    }

    if (move.isEnPassant) {
        newBoard[move.from.rank][move.to.file] = null;
    }

    return newBoard;
}

function generateLegalMoves(state) {
    const moves = [];
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const square = { file, rank };
            const piece = getPieceAt(state.board, square);
            if (piece && piece.color === state.turn) {
                const pieceMoves = generatePseudoLegalMoves(state, square);
                for (const move of pieceMoves) {
                    const newBoard = makeTemporaryMove(state.board, move);
                    if (!isInCheck(newBoard, state.turn)) {
                        moves.push(move);
                    }
                }
            }
        }
    }
    return moves;
}

// ============================================================
// EVALUATION
// ============================================================

function evaluateBoard(board, forColor) {
    let score = 0;

    // Material
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (!piece) continue;
            const value = PIECE_VALUES[piece.type];
            score += piece.color === forColor ? value : -value;
        }
    }

    // Positions
    for (let rank = 0; rank < BOARD_CONFIG.RANKS; rank++) {
        for (let file = 0; file < BOARD_CONFIG.FILES; file++) {
            const piece = board[rank][file];
            if (!piece) continue;
            let posBonus = 0;
            const tableRank = piece.color === 'white' ? rank : BOARD_CONFIG.RANKS - 1 - rank;
            if (piece.type === 'knight') {
                posBonus = (KNIGHT_POSITION_TABLE[tableRank] && KNIGHT_POSITION_TABLE[tableRank][file]) || 0;
            } else if (piece.type === 'pawn') {
                posBonus = (PAWN_POSITION_TABLE[tableRank] && PAWN_POSITION_TABLE[tableRank][file]) || 0;
            }
            score += piece.color === forColor ? posBonus : -posBonus;
        }
    }

    // King safety
    const kingSquare = findKing(board, forColor);
    const oppColor = forColor === 'white' ? 'black' : 'white';
    if (kingSquare) {
        if ([3, 4].includes(kingSquare.file) && [3, 4, 5].includes(kingSquare.rank)) {
            score -= 50;
        }
        if (kingSquare.file <= 2 || kingSquare.file >= 5) {
            const pawnRank = forColor === 'white' ? kingSquare.rank + 1 : kingSquare.rank - 1;
            for (let f = Math.max(0, kingSquare.file - 1); f <= Math.min(7, kingSquare.file + 1); f++) {
                const p = getPieceAt(board, { file: f, rank: pawnRank });
                if (p && p.type === 'pawn' && p.color === forColor) score += 15;
            }
        }
        if (isSquareAttacked(board, kingSquare, oppColor)) score -= 75;
    } else {
        score -= 10000;
    }

    // Center control
    const centerSquares = [{ file: 3, rank: 4 }, { file: 4, rank: 4 }, { file: 3, rank: 5 }, { file: 4, rank: 5 }];
    for (const sq of centerSquares) {
        const p = getPieceAt(board, sq);
        if (p) {
            if (p.color === forColor) {
                score += 10;
                if (p.type === 'knight' || p.type === 'bishop') score += 5;
            } else {
                score -= 10;
            }
        }
        if (isSquareAttacked(board, sq, forColor)) score += 5;
        if (isSquareAttacked(board, sq, oppColor)) score -= 5;
    }

    // Knight control
    const myPieces = getPiecesByColor(board, forColor);
    const oppPieces = getPiecesByColor(board, oppColor);
    const myKnights = myPieces.filter(p => p.piece.type === 'knight');
    const oppKnights = oppPieces.filter(p => p.piece.type === 'knight');
    score += (myKnights.length - oppKnights.length) * 20;

    const oppPawns = oppPieces.filter(p => p.piece.type === 'pawn');
    if (oppPawns.length > 4) score += myKnights.length * 10;

    let centerPieces = 0;
    for (let rank = 3; rank <= 5; rank++) {
        for (let file = 2; file <= 5; file++) {
            if (getPieceAt(board, { file, rank })) centerPieces++;
        }
    }
    if (centerPieces > 4) score += myKnights.length * 8;

    for (const knight of myKnights) {
        let isOutpost = true;
        const pawnDir = forColor === 'white' ? 1 : -1;
        for (let r = knight.square.rank; r >= 0 && r < BOARD_CONFIG.RANKS; r += pawnDir) {
            for (const f of [knight.square.file - 1, knight.square.file + 1]) {
                if (f >= 0 && f < BOARD_CONFIG.FILES) {
                    const p = getPieceAt(board, { file: f, rank: r });
                    if (p && p.type === 'pawn' && p.color !== forColor) { isOutpost = false; break; }
                }
            }
            if (!isOutpost) break;
        }
        if (isOutpost && knight.square.rank >= 3 && knight.square.rank <= 6) score += 25;
    }

    return score;
}

// ============================================================
// MINIMAX (make/unmake pattern)
// ============================================================

function makeMoveInPlace(state, move) {
    const board = state.board;
    const undo = {
        fromPiece: board[move.from.rank][move.from.file],
        toPiece: board[move.to.rank][move.to.file],
        castlingRights: {
            white: { ...state.castlingRights.white },
            black: { ...state.castlingRights.black },
        },
        enPassantTarget: state.enPassantTarget,
        halfMoveClock: state.halfMoveClock,
        isCheck: state.isCheck,
        isCheckmate: state.isCheckmate,
        isStalemate: state.isStalemate,
        isDraw: state.isDraw,
        turn: state.turn,
    };

    const piece = move.promotion
        ? { type: move.promotion, color: move.piece.color }
        : move.piece;

    board[move.from.rank][move.from.file] = null;
    board[move.to.rank][move.to.file] = piece;

    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') {
            undo.rookFrom = { file: 7, rank };
            undo.rookTo = { file: 5, rank };
            undo.rookPiece = board[rank][7];
            board[rank][5] = board[rank][7];
            board[rank][7] = null;
        } else {
            undo.rookFrom = { file: 0, rank };
            undo.rookTo = { file: 3, rank };
            undo.rookPiece = board[rank][0];
            board[rank][3] = board[rank][0];
            board[rank][0] = null;
        }
    }

    if (move.isEnPassant) {
        undo.epCaptureSquare = { file: move.to.file, rank: move.from.rank };
        undo.epCapturedPiece = board[move.from.rank][move.to.file];
        board[move.from.rank][move.to.file] = null;
    }

    if (move.piece.type === 'pawn' && Math.abs(move.to.rank - move.from.rank) === 2) {
        state.enPassantTarget = { file: move.from.file, rank: (move.from.rank + move.to.rank) / 2 };
    } else {
        state.enPassantTarget = null;
    }

    if (move.piece.type === 'king') {
        state.castlingRights[move.piece.color] = { kingside: false, queenside: false };
    }
    if (move.piece.type === 'rook') {
        if (move.from.file === 0) state.castlingRights[move.piece.color].queenside = false;
        if (move.from.file === 7) state.castlingRights[move.piece.color].kingside = false;
    }
    if (move.captured && move.captured.type === 'rook') {
        const capturedColor = move.captured.color;
        if (move.to.file === 0) state.castlingRights[capturedColor].queenside = false;
        if (move.to.file === 7) state.castlingRights[capturedColor].kingside = false;
    }

    state.turn = state.turn === 'white' ? 'black' : 'white';
    state.isCheck = isInCheck(board, state.turn);
    state.isCheckmate = false;
    state.isStalemate = false;

    return undo;
}

function unmakeMoveInPlace(state, move, undo) {
    const board = state.board;
    board[move.from.rank][move.from.file] = undo.fromPiece;
    board[move.to.rank][move.to.file] = undo.toPiece;

    if (undo.rookFrom && undo.rookTo) {
        board[undo.rookFrom.rank][undo.rookFrom.file] = board[undo.rookTo.rank][undo.rookTo.file];
        board[undo.rookTo.rank][undo.rookTo.file] = null;
    }

    if (undo.epCaptureSquare) {
        board[undo.epCaptureSquare.rank][undo.epCaptureSquare.file] = undo.epCapturedPiece;
    }

    state.castlingRights.white.kingside = undo.castlingRights.white.kingside;
    state.castlingRights.white.queenside = undo.castlingRights.white.queenside;
    state.castlingRights.black.kingside = undo.castlingRights.black.kingside;
    state.castlingRights.black.queenside = undo.castlingRights.black.queenside;
    state.enPassantTarget = undo.enPassantTarget;
    state.halfMoveClock = undo.halfMoveClock;
    state.isCheck = undo.isCheck;
    state.isCheckmate = undo.isCheckmate;
    state.isStalemate = undo.isStalemate;
    state.isDraw = undo.isDraw;
    state.turn = undo.turn;
}

function getMoveOrderScore(move) {
    let score = 0;
    if (move.captured) {
        const victimValue = SIMPLE_PIECE_VALUES[move.captured.type] || 0;
        const attackerValue = SIMPLE_PIECE_VALUES[move.piece.type] || 0;
        score += 10000 + victimValue - attackerValue / 100;
    }
    if (move.promotion) score += 9000;
    if (move.to.file >= 3 && move.to.file <= 4 && move.to.rank >= 3 && move.to.rank <= 5) score += 50;
    return score;
}

function orderMovesInPlace(moves) {
    moves.sort((a, b) => getMoveOrderScore(b) - getMoveOrderScore(a));
}

function minimax(state, depth, alpha, beta, isMaximizing, aiColor, nodesSearched) {
    if (depth === 0 || state.isCheckmate || state.isStalemate || state.isDraw) {
        let score;
        if (state.isCheckmate) {
            score = state.turn === aiColor ? -100000 : 100000;
        } else if (state.isStalemate || state.isDraw) {
            score = 0;
        } else {
            score = evaluateBoard(state.board, aiColor);
        }
        return { move: null, score, nodesSearched: nodesSearched + 1 };
    }

    const moves = generateLegalMoves(state);
    if (moves.length === 0) {
        if (state.isCheck) {
            return { move: null, score: isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth), nodesSearched: nodesSearched + 1 };
        }
        return { move: null, score: 0, nodesSearched: nodesSearched + 1 };
    }

    orderMovesInPlace(moves);
    let bestMove = null;
    let totalNodes = nodesSearched;

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of moves) {
            const undo = makeMoveInPlace(state, move);
            const childMoves = generateLegalMoves(state);
            if (childMoves.length === 0) {
                if (state.isCheck) state.isCheckmate = true;
                else { state.isStalemate = true; state.isDraw = true; }
            }
            const result = minimax(state, depth - 1, alpha, beta, false, aiColor, totalNodes);
            totalNodes = result.nodesSearched;
            unmakeMoveInPlace(state, move, undo);
            if (result.score > maxScore) { maxScore = result.score; bestMove = move; }
            alpha = Math.max(alpha, result.score);
            if (beta <= alpha) break;
        }
        return { move: bestMove, score: maxScore, nodesSearched: totalNodes };
    } else {
        let minScore = Infinity;
        for (const move of moves) {
            const undo = makeMoveInPlace(state, move);
            const childMoves = generateLegalMoves(state);
            if (childMoves.length === 0) {
                if (state.isCheck) state.isCheckmate = true;
                else { state.isStalemate = true; state.isDraw = true; }
            }
            const result = minimax(state, depth - 1, alpha, beta, true, aiColor, totalNodes);
            totalNodes = result.nodesSearched;
            unmakeMoveInPlace(state, move, undo);
            if (result.score < minScore) { minScore = result.score; bestMove = move; }
            beta = Math.min(beta, result.score);
            if (beta <= alpha) break;
        }
        return { move: bestMove, score: minScore, nodesSearched: totalNodes };
    }
}

function findBestMove(state, depth, aiColor) {
    return minimax(state, depth, -Infinity, Infinity, state.turn === aiColor, aiColor, 0);
}

// ============================================================
// BLUNDER SYSTEM
// ============================================================

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function applyMoveToBoard(state, move) {
    const board = cloneBoard(state.board);
    const piece = move.promotion ? { type: move.promotion, color: move.piece.color } : move.piece;
    board[move.from.rank][move.from.file] = null;
    board[move.to.rank][move.to.file] = piece;
    if (move.isEnPassant) board[move.from.rank][move.to.file] = null;
    if (move.isCastling) {
        const rank = move.from.rank;
        if (move.isCastling === 'kingside') { board[rank][5] = board[rank][7]; board[rank][7] = null; }
        else { board[rank][3] = board[rank][0]; board[rank][0] = null; }
    }
    const turn = state.turn === 'white' ? 'black' : 'white';
    return { board, turn };
}

function getBlunderConfig(difficulty) {
    if (difficulty === 'easy') {
        return {
            blunderChance: 0.35,
            blunderTypes: { hangPiece: true, missCapture: true, badTrade: true, weakMove: true },
            safetyChecks: { neverAllowMateIn1: true, neverHangQueen: false, alwaysPlayCheckmate: true },
        };
    }
    if (difficulty === 'medium') {
        return {
            blunderChance: 0.15,
            blunderTypes: { hangPiece: false, missCapture: true, badTrade: true, weakMove: true },
            safetyChecks: { neverAllowMateIn1: true, neverHangQueen: true, alwaysPlayCheckmate: true },
        };
    }
    return {
        blunderChance: 0.03,
        blunderTypes: { hangPiece: false, missCapture: false, badTrade: false, weakMove: true },
        safetyChecks: { neverAllowMateIn1: true, neverHangQueen: true, alwaysPlayCheckmate: true },
    };
}

function isSafeBlunder(state, move, safety) {
    const { board, turn: oppTurn } = applyMoveToBoard(state, move);
    const oppCheck = isInCheck(board, oppTurn);

    if (safety.neverAllowMateIn1) {
        const tempState = {
            ...state, board, turn: oppTurn, isCheck: oppCheck,
            isCheckmate: false, isStalemate: false, isDraw: false, enPassantTarget: null, moveHistory: [],
        };
        const opponentMoves = generateLegalMoves(tempState);
        for (const oppMove of opponentMoves) {
            const after = applyMoveToBoard(tempState, oppMove);
            const ourColor = state.turn;
            const ourCheck = isInCheck(after.board, ourColor);
            if (!ourCheck) continue;
            const ourState = {
                ...state, board: after.board, turn: ourColor, isCheck: ourCheck,
                isCheckmate: false, isStalemate: false, isDraw: false, enPassantTarget: null, moveHistory: [],
            };
            const ourMoves = generateLegalMoves(ourState);
            if (ourMoves.length === 0) return false;
        }
    }

    if (safety.neverHangQueen && move.piece.type === 'queen') {
        const oppColor = state.turn === 'white' ? 'black' : 'white';
        if (isSquareAttacked(board, move.to, oppColor)) return false;
    }

    return true;
}

function findHangingMove(moves, state) {
    for (const move of shuffleArray([...moves])) {
        if (move.piece.type !== 'king' && move.piece.type !== 'queen') {
            const { board } = applyMoveToBoard(state, move);
            const oppColor = state.turn === 'white' ? 'black' : 'white';
            if (isSquareAttacked(board, move.to, oppColor)) return move;
        }
    }
    return null;
}

function findNonCapture(moves) {
    const captures = moves.filter(m => m.captured);
    const nonCaptures = moves.filter(m => !m.captured);
    if (captures.length > 0 && nonCaptures.length > 0) {
        return nonCaptures[Math.floor(Math.random() * nonCaptures.length)];
    }
    return null;
}

function findBadTrade(moves, state) {
    const pieceVals = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
    for (const move of shuffleArray([...moves])) {
        if (move.captured) {
            const { board } = applyMoveToBoard(state, move);
            const oppColor = state.turn === 'white' ? 'black' : 'white';
            if (isSquareAttacked(board, move.to, oppColor)) {
                if (pieceVals[move.piece.type] > pieceVals[move.captured.type]) return move;
            }
        }
    }
    return null;
}

function selectWeakMove(moves, bestMove) {
    if (moves.length <= 1) return moves[0] || bestMove;
    if (bestMove) {
        const otherMoves = moves.filter(m =>
            !(m.from.file === bestMove.from.file && m.from.rank === bestMove.from.rank &&
              m.to.file === bestMove.to.file && m.to.rank === bestMove.to.rank));
        if (otherMoves.length > 0) {
            const midPoint = Math.floor(otherMoves.length / 2);
            const weakerMoves = otherMoves.slice(midPoint);
            return weakerMoves[Math.floor(Math.random() * weakerMoves.length)];
        }
    }
    return moves[Math.floor(Math.random() * moves.length)];
}

function selectBlunderMove(state, moves, bestMove, difficulty) {
    const config = getBlunderConfig(difficulty);
    const safeMoves = moves.filter(move => isSafeBlunder(state, move, config.safetyChecks));
    if (safeMoves.length === 0) return bestMove;

    const availableTypes = [];
    if (config.blunderTypes.hangPiece) availableTypes.push('hangPiece');
    if (config.blunderTypes.missCapture) availableTypes.push('missCapture');
    if (config.blunderTypes.weakMove) availableTypes.push('weakMove');
    if (config.blunderTypes.badTrade) availableTypes.push('badTrade');

    if (availableTypes.length === 0) return selectWeakMove(safeMoves, bestMove);

    const blunderType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    switch (blunderType) {
        case 'hangPiece': return findHangingMove(safeMoves, state) || selectWeakMove(safeMoves, bestMove);
        case 'missCapture': return findNonCapture(safeMoves) || selectWeakMove(safeMoves, bestMove);
        case 'badTrade': return findBadTrade(safeMoves, state) || selectWeakMove(safeMoves, bestMove);
        case 'weakMove': default: return selectWeakMove(safeMoves, bestMove);
    }
}

// ============================================================
// CHECKMATE DETECTION
// ============================================================

function findCheckmateMove(state, moves) {
    for (const move of moves) {
        const newBoard = cloneBoard(state.board);
        const piece = move.promotion ? { type: move.promotion, color: move.piece.color } : move.piece;
        newBoard[move.from.rank][move.from.file] = null;
        newBoard[move.to.rank][move.to.file] = piece;

        if (move.isEnPassant) newBoard[move.from.rank][move.to.file] = null;
        if (move.isCastling) {
            const rank = move.from.rank;
            if (move.isCastling === 'kingside') { newBoard[rank][5] = newBoard[rank][7]; newBoard[rank][7] = null; }
            else { newBoard[rank][3] = newBoard[rank][0]; newBoard[rank][0] = null; }
        }

        const opponentColor = state.turn === 'white' ? 'black' : 'white';
        if (!isInCheck(newBoard, opponentColor)) continue;

        const tempState = {
            ...state, board: newBoard, turn: opponentColor, isCheck: true,
            isCheckmate: false, isStalemate: false, isDraw: false, enPassantTarget: null,
        };
        const opponentMoves = generateLegalMoves(tempState);
        if (opponentMoves.length === 0) return move;
    }
    return null;
}

// ============================================================
// MAIN AI FUNCTION
// ============================================================

function getAIMove(state, difficulty, aiColor) {
    const config = AI_CONFIG[difficulty];
    const legalMoves = generateLegalMoves(state);

    if (legalMoves.length === 0) return null;

    if (legalMoves.length === 1) {
        return {
            move: legalMoves[0],
            thinkTime: 200,
            evaluation: 0,
            depth: 0,
            nodesSearched: 1,
            isBlunder: false,
        };
    }

    const checkmateMove = findCheckmateMove(state, legalMoves);
    if (checkmateMove) {
        return {
            move: checkmateMove,
            thinkTime: 500,
            evaluation: 100000,
            depth: 1,
            nodesSearched: legalMoves.length,
            isBlunder: false,
        };
    }

    const searchState = cloneGameState(state);
    const searchResult = findBestMove(searchState, config.searchDepth, aiColor);

    if (!searchResult.move) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const { min, max } = config.thinkTime;
        return {
            move: randomMove,
            thinkTime: min + Math.random() * (max - min),
            evaluation: 0,
            depth: config.searchDepth,
            nodesSearched: searchResult.nodesSearched,
            isBlunder: true,
        };
    }

    let finalMove = searchResult.move;
    let isBlunder = false;

    if (Math.random() < config.blunderChance) {
        const blunderMove = selectBlunderMove(state, legalMoves, searchResult.move, difficulty);
        if (blunderMove) {
            finalMove = blunderMove;
            isBlunder = true;
        }
    }

    const { min, max } = config.thinkTime;
    return {
        move: finalMove,
        thinkTime: min + Math.random() * (max - min),
        evaluation: searchResult.score,
        depth: config.searchDepth,
        nodesSearched: searchResult.nodesSearched,
        isBlunder,
    };
}

// ============================================================
// WORKER MESSAGE HANDLER
// ============================================================

self.onmessage = function(e) {
    const { type, gameState, difficulty, aiColor } = e.data;

    if (type === 'computeMove') {
        try {
            const result = getAIMove(gameState, difficulty, aiColor);
            self.postMessage({ type: 'moveResult', result });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message || 'AI computation failed' });
        }
    }
};
