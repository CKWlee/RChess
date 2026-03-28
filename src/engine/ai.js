
import { deepCopy, isWhite, isInCheck, generateLegalMoves } from './chess.js';

// keep eval intentionally cheap so depth bumps don't freeze the UI thread.
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const PST_PAWN = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const isWhitePiece = isWhite(p);
      const val = PIECE_VALUES[p.toUpperCase()] || 0;
      const type = p.toUpperCase();
      let positional = 0;
      if (type === 'P') {
        positional = isWhitePiece ? PST_PAWN[r][c] : PST_PAWN[7 - r][c];
      } else if (type === 'N') {
        positional = isWhitePiece ? PST_KNIGHT[r][c] : PST_KNIGHT[7 - r][c];
      }

      score += isWhitePiece ? (val + positional) : -(val + positional);
    }
  }
  return score;
}

// capture-first ordering helps alpha-beta cut branches earlier in browser time budgets.
export function minimax(board, depth, alpha, beta, isMaximizing, castling, enPassant) {
  if (depth === 0) return { score: evaluateBoard(board) };

  const color = isMaximizing ? 'w' : 'b';
  const moves = generateLegalMoves(board, color, castling, enPassant);

  if (moves.length === 0) {
    return { score: isInCheck(board, color) ? (isMaximizing ? -99999 : 99999) : 0 };
  }
  moves.sort((a, b) => {
    const victimA = board[a.to.row][a.to.col];
    const victimB = board[b.to.row][b.to.col];
    const scoreA = victimA ? 10 * (PIECE_VALUES[victimA.toUpperCase()] || 0) - (PIECE_VALUES[board[a.from.row][a.from.col]?.toUpperCase()] || 0) : 0;
    const scoreB = victimB ? 10 * (PIECE_VALUES[victimB.toUpperCase()] || 0) - (PIECE_VALUES[board[b.from.row][b.from.col]?.toUpperCase()] || 0) : 0;
    return scoreB - scoreA;
  });

  let bestMove = moves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const nb = deepCopy(board);
      const movedPiece = nb[m.from.row][m.from.col];
      nb[m.to.row][m.to.col] = m.promotion || movedPiece;
      nb[m.from.row][m.from.col] = null;
      if (movedPiece?.toUpperCase() === 'P' && m.to.col !== m.from.col && !board[m.to.row][m.to.col])
        nb[m.from.row][m.to.col] = null;
      let newEp = null;
      if (movedPiece?.toUpperCase() === 'P' && Math.abs(m.to.row - m.from.row) === 2) {
        newEp = { row: (m.from.row + m.to.row) / 2, col: m.from.col };
      }
      const { score } = minimax(nb, depth - 1, alpha, beta, false, castling, newEp);
      if (score > maxEval) { maxEval = score; bestMove = m; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const nb = deepCopy(board);
      const movedPiece = nb[m.from.row][m.from.col];
      nb[m.to.row][m.to.col] = m.promotion || movedPiece;
      nb[m.from.row][m.from.col] = null;
      if (movedPiece?.toUpperCase() === 'P' && m.to.col !== m.from.col && !board[m.to.row][m.to.col])
        nb[m.from.row][m.to.col] = null;
      let newEp = null;
      if (movedPiece?.toUpperCase() === 'P' && Math.abs(m.to.row - m.from.row) === 2) {
        newEp = { row: (m.from.row + m.to.row) / 2, col: m.from.col };
      }
      const { score } = minimax(nb, depth - 1, alpha, beta, true, castling, newEp);
      if (score < minEval) { minEval = score; bestMove = m; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// depth alone isn't player-facing, so we map it to a fake Elo for readable rating logs.
export const DEPTH_TO_ELO = {
  1: 600,
  2: 700,
  3: 800,
  4: 1000,
  5: 1100,
};
