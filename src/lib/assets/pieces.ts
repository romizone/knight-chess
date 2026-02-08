// Chess Piece Assets Index

// Piece file naming convention:
// wK = white King, bK = black King
// wQ = white Queen, bQ = black Queen
// wR = white Rook, bR = black Rook
// wB = white Bishop, bB = black Bishop
// wN = white Knight, bN = black Knight
// wP = white Pawn, bP = black Pawn

export const PIECE_IMAGES = {
    white: {
        king: '/pieces/wK.svg',
        queen: '/pieces/wQ.svg',
        rook: '/pieces/wR.svg',
        bishop: '/pieces/wB.svg',
        knight: '/pieces/wN.svg',
        pawn: '/pieces/wP.svg',
    },
    black: {
        king: '/pieces/bK.svg',
        queen: '/pieces/bQ.svg',
        rook: '/pieces/bR.svg',
        bishop: '/pieces/bB.svg',
        knight: '/pieces/bN.svg',
        pawn: '/pieces/bP.svg',
    },
};

export function getPieceImage(color: 'white' | 'black', type: string): string {
    return PIECE_IMAGES[color][type as keyof typeof PIECE_IMAGES.white] || '';
}
