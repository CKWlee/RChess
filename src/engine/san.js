
import {
  deepCopy, pieceColor, isInCheck, generateLegalMoves,
  indexToAlgebraic, algebraicToIndex,
} from './chess.js';

// SAN text is what users see in console/history, so this stays strict and deterministic.
export function moveToSAN(board, move, legalMoves, castling, enPassant) {
  const piece = board[move.from.row][move.from.col];
  const type = piece.toUpperCase();
  const captured = board[move.to.row][move.to.col];
  const toSq = indexToAlgebraic(move.to.row, move.to.col);
  const fromSq = indexToAlgebraic(move.from.row, move.from.col);
  if (type === 'K' && Math.abs(move.to.col - move.from.col) === 2) {
    return move.to.col === 6 ? 'O-O' : 'O-O-O';
  }

  let san = '';
  if (type !== 'P') {
    san += type;
  }
  if (type !== 'P') {
    const ambiguous = legalMoves.filter(
      (m) =>
        m.to.row === move.to.row &&
        m.to.col === move.to.col &&
        (m.from.row !== move.from.row || m.from.col !== move.from.col) &&
        board[m.from.row][m.from.col]?.toUpperCase() === type
    );
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((m) => m.from.col === move.from.col);
      const sameRank = ambiguous.some((m) => m.from.row === move.from.row);
      if (!sameFile) {
        san += fromSq[0];
      } else if (!sameRank) {
        san += fromSq[1];
      } else {
        san += fromSq;
      }
    }
  }
  const isEnPassant = type === 'P' && move.to.col !== move.from.col && !captured;
  if (captured || isEnPassant) {
    if (type === 'P') san += fromSq[0];
    san += 'x';
  }
  san += toSq;
  if (move.promotion) {
    san += '=' + move.promotion.toUpperCase();
  }
  const testBoard = deepCopy(board);
  testBoard[move.to.row][move.to.col] = move.promotion || piece;
  testBoard[move.from.row][move.from.col] = null;
  if (isEnPassant) testBoard[move.from.row][move.to.col] = null;
  if (type === 'K' && Math.abs(move.to.col - move.from.col) === 2) {
    const row = move.from.row;
    if (move.to.col === 6) { testBoard[row][5] = testBoard[row][7]; testBoard[row][7] = null; }
    if (move.to.col === 2) { testBoard[row][3] = testBoard[row][0]; testBoard[row][0] = null; }
  }

  const enemyColor = pieceColor(piece) === 'w' ? 'b' : 'w';
  if (isInCheck(testBoard, enemyColor)) {
    const enemyMoves = generateLegalMoves(testBoard, enemyColor, castling, enPassant);
    san += enemyMoves.length === 0 ? '#' : '+';
  }

  return san;
}

// parse loosely (aliases/noise), then snap to one legal move so command UX is forgiving.
export function parseSAN(sanInput, legalMoves, board, color) {
  let san = sanInput.trim().replace(/[+#!?]+$/, '');
  if (san === 'O-O' || san === '0-0') {
    const row = color === 'w' ? 7 : 0;
    return legalMoves.find(
      (m) => m.from.row === row && m.from.col === 4 && m.to.row === row && m.to.col === 6
    ) || null;
  }
  if (san === 'O-O-O' || san === '0-0-0') {
    const row = color === 'w' ? 7 : 0;
    return legalMoves.find(
      (m) => m.from.row === row && m.from.col === 4 && m.to.row === row && m.to.col === 2
    ) || null;
  }
  let promotion = null;
  const promoMatch = san.match(/=?([QRBNqrbn])$/);
  if (promoMatch) {
    promotion = promoMatch[1].toUpperCase();
    san = san.replace(/=?[QRBNqrbn]$/, '');
  }
  san = san.replace(/x/gi, '');
  let pieceType = 'P';
  if (san.length > 0 && 'KQRBN'.includes(san[0])) {
    pieceType = san[0];
    san = san.slice(1);
  }
  if (san.length < 2) return null;
  const destStr = san.slice(-2);
  if (!/^[a-h][1-8]$/.test(destStr)) return null;
  const dest = algebraicToIndex(destStr);
  const disambig = san.slice(0, -2);
  let disambigFile = null;
  let disambigRank = null;
  for (const ch of disambig) {
    if (ch >= 'a' && ch <= 'h') disambigFile = ch.charCodeAt(0) - 97;
    else if (ch >= '1' && ch <= '8') disambigRank = 8 - parseInt(ch, 10);
  }
  const matches = legalMoves.filter((m) => {
    if (m.to.row !== dest.row || m.to.col !== dest.col) return false;
    const p = board[m.from.row][m.from.col];
    if (!p || p.toUpperCase() !== pieceType) return false;
    if (pieceColor(p) !== color) return false;
    if (disambigFile !== null && m.from.col !== disambigFile) return false;
    if (disambigRank !== null && m.from.row !== disambigRank) return false;
    if (promotion) {
      if (!m.promotion) return false;
      if (m.promotion.toUpperCase() !== promotion) return false;
    } else {
      if (m.promotion && m.promotion.toUpperCase() !== 'Q') return false;
    }
    return true;
  });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const queenPromo = matches.find((m) => m.promotion?.toUpperCase() === 'Q');
    if (queenPromo) return queenPromo;
    return matches[0];
  }
  return null;
}
