
// one source of truth for piece metadata keeps board/tooltips from drifting.
export const PIECES = {
  K: { name: 'King', color: 'w', symbol: '♔' },
  Q: { name: 'Queen', color: 'w', symbol: '♕' },
  R: { name: 'Rook', color: 'w', symbol: '♖' },
  B: { name: 'Bishop', color: 'w', symbol: '♗' },
  N: { name: 'Knight', color: 'w', symbol: '♘' },
  P: { name: 'Pawn', color: 'w', symbol: '♙' },
  k: { name: 'King', color: 'b', symbol: '♚' },
  q: { name: 'Queen', color: 'b', symbol: '♛' },
  r: { name: 'Rook', color: 'b', symbol: '♜' },
  b: { name: 'Bishop', color: 'b', symbol: '♝' },
  n: { name: 'Knight', color: 'b', symbol: '♞' },
  p: { name: 'Pawn', color: 'b', symbol: '♟' },
};

export function createInitialBoard() {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
  ];
}

// SAN parsing and UI tooltips both hop between algebraic + matrix coords all the time.
export function algebraicToIndex(sq) {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1], 10);
  return { row, col };
}

export function indexToAlgebraic(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

export function isWhite(piece) {
  return piece && piece === piece.toUpperCase();
}

export function isBlack(piece) {
  return piece && piece === piece.toLowerCase();
}

export function pieceColor(piece) {
  if (!piece) return null;
  return isWhite(piece) ? 'w' : 'b';
}

export function deepCopy(board) {
  return board.map((r) => [...r]);
}

const PIECE_NAMES = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };

export function getPieceName(piece) {
  if (!piece) return '–';
  const color = isWhite(piece) ? 'White' : 'Black';
  return `${color} ${PIECE_NAMES[piece.toUpperCase()]}`;
}

// check detection sits here so SAN, AI, and move validation all share the same rules.
function findKing(board, color) {
  const king = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === king) return { row: r, col: c };
  return null;
}

export function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (pieceColor(p) !== byColor) continue;
      const type = p.toUpperCase();
      const dr = row - r;
      const dc = col - c;
      const adr = Math.abs(dr);
      const adc = Math.abs(dc);

      if (type === 'P') {
        const dir = byColor === 'w' ? -1 : 1;
        if (dr === dir && adc === 1) return true;
      } else if (type === 'N') {
        if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) return true;
      } else if (type === 'K') {
        if (adr <= 1 && adc <= 1 && (adr + adc > 0)) return true;
      } else if (type === 'R' || type === 'Q') {
        if (dr === 0 || dc === 0) {
          if (isPathClear(board, r, c, row, col)) return true;
        }
      }
      if (type === 'B' || type === 'Q') {
        if (adr === adc && adr > 0) {
          if (isPathClear(board, r, c, row, col)) return true;
        }
      }
    }
  }
  return false;
}

function isPathClear(board, r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);
  let r = r1 + dr;
  let c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (board[r][c]) return false;
    r += dr;
    c += dc;
  }
  return true;
}

export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.row, king.col, color === 'w' ? 'b' : 'w');
}

// generate first, then filter by self-check so every caller gets consistent legal moves.
export function generateLegalMoves(board, color, castling, enPassant) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || pieceColor(p) !== color) continue;
      const pieceMoves = generatePieceMoves(board, r, c, p, castling, enPassant);
      for (const m of pieceMoves) {
        const testBoard = deepCopy(board);
        testBoard[m.toRow][m.toCol] = testBoard[r][c];
        testBoard[r][c] = null;
        if (p.toUpperCase() === 'P' && m.toCol !== c && !board[m.toRow][m.toCol]) {
          testBoard[r][m.toCol] = null;
        }
        if (!isInCheck(testBoard, color)) {
          moves.push({
            from: { row: r, col: c },
            to: { row: m.toRow, col: m.toCol },
            promotion: m.promotion,
          });
        }
      }
    }
  }
  return moves;
}

function generatePieceMoves(board, r, c, piece, castling, enPassant) {
  const moves = [];
  const color = pieceColor(piece);
  const type = piece.toUpperCase();
  const enemy = color === 'w' ? 'b' : 'w';

  const addMove = (tr, tc, promo) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
    const target = board[tr][tc];
    if (target && pieceColor(target) === color) return;
    moves.push({ toRow: tr, toCol: tc, promotion: promo });
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    if (!board[r + dir]?.[c] && r + dir >= 0 && r + dir <= 7) {
      if (r + dir === promoRow) {
        ['Q', 'R', 'B', 'N'].forEach((pp) =>
          addMove(r + dir, c, color === 'w' ? pp : pp.toLowerCase())
        );
      } else {
        addMove(r + dir, c);
      }
      if (r === startRow && !board[r + 2 * dir]?.[c]) addMove(r + 2 * dir, c);
    }
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (tc < 0 || tc > 7 || tr < 0 || tr > 7) continue;
      const target = board[tr][tc];
      if (target && pieceColor(target) === enemy) {
        if (tr === promoRow) {
          ['Q', 'R', 'B', 'N'].forEach((pp) =>
            addMove(tr, tc, color === 'w' ? pp : pp.toLowerCase())
          );
        } else {
          addMove(tr, tc);
        }
      }
      if (enPassant && enPassant.row === tr && enPassant.col === tc) {
        addMove(tr, tc);
      }
    }
  } else if (type === 'N') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]])
      addMove(r + dr, c + dc);
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr || dc) addMove(r + dr, c + dc);
    if (color === 'w') {
      if (castling.includes('K') && !board[7][5] && !board[7][6] && board[7][7] === 'R' &&
          !isInCheck(board, 'w') && !isSquareAttacked(board, 7, 5, 'b') && !isSquareAttacked(board, 7, 6, 'b'))
        moves.push({ toRow: 7, toCol: 6 });
      if (castling.includes('Q') && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] === 'R' &&
          !isInCheck(board, 'w') && !isSquareAttacked(board, 7, 3, 'b') && !isSquareAttacked(board, 7, 2, 'b'))
        moves.push({ toRow: 7, toCol: 2 });
    } else {
      if (castling.includes('k') && !board[0][5] && !board[0][6] && board[0][7] === 'r' &&
          !isInCheck(board, 'b') && !isSquareAttacked(board, 0, 5, 'w') && !isSquareAttacked(board, 0, 6, 'w'))
        moves.push({ toRow: 0, toCol: 6 });
      if (castling.includes('q') && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] === 'r' &&
          !isInCheck(board, 'b') && !isSquareAttacked(board, 0, 3, 'w') && !isSquareAttacked(board, 0, 2, 'w'))
        moves.push({ toRow: 0, toCol: 2 });
    }
  } else {
    const dirs = [];
    if (type === 'R' || type === 'Q') dirs.push([0, 1], [0, -1], [1, 0], [-1, 0]);
    if (type === 'B' || type === 'Q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    for (const [dr, dc] of dirs) {
      let tr = r + dr, tc = c + dc;
      while (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
        if (board[tr][tc]) {
          if (pieceColor(board[tr][tc]) === enemy) addMove(tr, tc);
          break;
        }
        addMove(tr, tc);
        tr += dr;
        tc += dc;
      }
    }
  }
  return moves;
}

export function boardToFEN(board, turn, castling, enPassant, halfmove = 0, fullmove = 1) {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      if (board[r][c]) {
        if (empty) { fen += empty; empty = 0; }
        fen += board[r][c];
      } else empty++;
    }
    if (empty) fen += empty;
    if (r < 7) fen += '/';
  }
  const epStr = enPassant ? indexToAlgebraic(enPassant.row, enPassant.col) : '-';
  return `${fen} ${turn} ${castling || '-'} ${epStr} ${halfmove} ${fullmove}`;
}
