
import { useState, useCallback } from 'react';
import {
  createInitialBoard, deepCopy, pieceColor, isWhite,
  isInCheck, generateLegalMoves, indexToAlgebraic, algebraicToIndex,
  PIECES, getPieceName,
} from '../engine/chess.js';
import { moveToSAN, parseSAN } from '../engine/san.js';
import { minimax } from '../engine/ai.js';

export function useChessGame(addConsoleLine) {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState('w');
  const [castling, setCastling] = useState('KQkq');
  const [enPassant, setEnPassant] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveCount, setMoveCount] = useState(1);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiDepth, setAiDepth] = useState(3);
  const [lastMove, setLastMove] = useState(null);

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setTurn('w');
    setCastling('KQkq');
    setEnPassant(null);
    setGameOver(null);
    setMoveHistory([]);
    setMoveCount(1);
    setLastMove(null);
  }, []);

  const executeMove = useCallback(
    (moveStr) => {
      if (gameOver) {
        addConsoleLine('error', 'Error: Game is over. Type new_game() to start a new game.');
        return;
      }
      if (turn !== 'w') {
        addConsoleLine('error', 'Error: Wait for engine response.');
        return;
      }

      const cleaned = moveStr.replace(/['"]/g, '').trim();
      if (cleaned.length === 0) {
        addConsoleLine('error', `Error in move("${moveStr}") : Empty move. Type help() for usage.`);
        return;
      }

      const legalMoves = generateLegalMoves(board, 'w', castling, enPassant);
      let legal = parseSAN(cleaned, legalMoves, board, 'w');
      if (!legal) {
        const coordMatch = cleaned.toLowerCase().match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
        if (coordMatch) {
          const from = algebraicToIndex(coordMatch[1]);
          const to = algebraicToIndex(coordMatch[2]);
          legal = legalMoves.find(
            (m) => m.from.row === from.row && m.from.col === from.col &&
                   m.to.row === to.row && m.to.col === to.col &&
                   (!coordMatch[3] || m.promotion?.toUpperCase() === coordMatch[3].toUpperCase())
          );
          if (!legal) {
            legal = legalMoves.find(
              (m) => m.from.row === from.row && m.from.col === from.col &&
                     m.to.row === to.row && m.to.col === to.col
            );
          }
        }
      }

      if (!legal) {
        addConsoleLine('error', `Error in move("${moveStr}") : Illegal or unrecognized move. Type help() for notation guide.`);
        return;
      }
      const san = moveToSAN(board, legal, legalMoves, castling, enPassant);
      const from = legal.from;
      const to = legal.to;
      const newBoard = deepCopy(board);
      const piece = newBoard[from.row][from.col];
      const captured = newBoard[to.row][to.col];
      let newCastling = castling;
      let newEnPassant = null;

      if (piece.toUpperCase() === 'P' && to.col !== from.col && !captured) {
        newBoard[from.row][to.col] = null;
      }
      if (piece === 'K' && Math.abs(to.col - from.col) === 2) {
        if (to.col === 6) { newBoard[7][5] = 'R'; newBoard[7][7] = null; }
        if (to.col === 2) { newBoard[7][3] = 'R'; newBoard[7][0] = null; }
      }

      const promoPiece = legal.promotion || piece;
      newBoard[to.row][to.col] = promoPiece;
      newBoard[from.row][from.col] = null;

      if (piece === 'K') newCastling = newCastling.replace(/[KQ]/g, '');
      if (piece === 'R' && from.col === 0 && from.row === 7) newCastling = newCastling.replace('Q', '');
      if (piece === 'R' && from.col === 7 && from.row === 7) newCastling = newCastling.replace('K', '');
      if (to.row === 0 && to.col === 0) newCastling = newCastling.replace('q', '');
      if (to.row === 0 && to.col === 7) newCastling = newCastling.replace('k', '');
      if (to.row === 7 && to.col === 0) newCastling = newCastling.replace('Q', '');
      if (to.row === 7 && to.col === 7) newCastling = newCastling.replace('K', '');

      if (piece.toUpperCase() === 'P' && Math.abs(to.row - from.row) === 2) {
        newEnPassant = { row: (from.row + to.row) / 2, col: from.col };
      }

      const fromSq = indexToAlgebraic(from.row, from.col);
      const toSq = indexToAlgebraic(to.row, to.col);

      setBoard(newBoard);
      setCastling(newCastling);
      setEnPassant(newEnPassant);
      setTurn('b');
      setLastMove({ from: fromSq, to: toSq });
      setMoveHistory((h) => [...h, san]);
      addConsoleLine('output', `[1] "${san}"`);
      const blackMoves = generateLegalMoves(newBoard, 'b', newCastling, newEnPassant);
      if (blackMoves.length === 0) {
        if (isInCheck(newBoard, 'b')) {
          addConsoleLine('output', '[1] "Checkmate! White wins."');
          setGameOver('white');
        } else {
          addConsoleLine('output', '[1] "Stalemate. Draw."');
          setGameOver('draw');
        }
        return { rendering: true };
      }
      setAiThinking(true);
      setTimeout(() => {
        const aiLegalMoves = generateLegalMoves(newBoard, 'b', newCastling, newEnPassant);
        const result = minimax(newBoard, aiDepth, -Infinity, Infinity, false, newCastling, newEnPassant);
        if (result.move) {
          const m = result.move;
          const aiSan = moveToSAN(newBoard, m, aiLegalMoves, newCastling, newEnPassant);
          const aiBoard = deepCopy(newBoard);
          const aiPiece = aiBoard[m.from.row][m.from.col];
          const aiCaptured = aiBoard[m.to.row][m.to.col];

          if (aiPiece.toUpperCase() === 'P' && m.to.col !== m.from.col && !aiCaptured) {
            aiBoard[m.from.row][m.to.col] = null;
          }
          if (aiPiece === 'k' && Math.abs(m.to.col - m.from.col) === 2) {
            if (m.to.col === 6) { aiBoard[0][5] = 'r'; aiBoard[0][7] = null; }
            if (m.to.col === 2) { aiBoard[0][3] = 'r'; aiBoard[0][0] = null; }
          }

          let updatedCastling = newCastling;
          if (aiPiece === 'k') updatedCastling = updatedCastling.replace(/[kq]/g, '');
          if (aiPiece === 'r' && m.from.col === 0 && m.from.row === 0) updatedCastling = updatedCastling.replace('q', '');
          if (aiPiece === 'r' && m.from.col === 7 && m.from.row === 0) updatedCastling = updatedCastling.replace('k', '');
          if (m.to.row === 7 && m.to.col === 0) updatedCastling = updatedCastling.replace('Q', '');
          if (m.to.row === 7 && m.to.col === 7) updatedCastling = updatedCastling.replace('K', '');

          const promoPiece2 = m.promotion || aiPiece;
          aiBoard[m.to.row][m.to.col] = promoPiece2;
          aiBoard[m.from.row][m.from.col] = null;

          let newEp2 = null;
          if (aiPiece.toUpperCase() === 'P' && Math.abs(m.to.row - m.from.row) === 2) {
            newEp2 = { row: (m.from.row + m.to.row) / 2, col: m.from.col };
          }

          const aiFromAlg = indexToAlgebraic(m.from.row, m.from.col);
          const aiToAlg = indexToAlgebraic(m.to.row, m.to.col);

          setBoard(aiBoard);
          setCastling(updatedCastling);
          setEnPassant(newEp2);
          setTurn('w');
          setLastMove({ from: aiFromAlg, to: aiToAlg });
          setMoveHistory((h) => [...h, aiSan]);
          addConsoleLine('output', `[1] "Engine: ${aiSan}"`);

          const whiteMoves = generateLegalMoves(aiBoard, 'w', updatedCastling, newEp2);
          if (whiteMoves.length === 0) {
            if (isInCheck(aiBoard, 'w')) {
              addConsoleLine('output', '[1] "Checkmate! Black wins."');
              setGameOver('black');
            } else {
              addConsoleLine('output', '[1] "Stalemate. Draw."');
              setGameOver('draw');
            }
          }
        }
        setAiThinking(false);
        setMoveCount((c) => c + 1);
      }, 600 + Math.random() * 800);

      return { rendering: true };
    },
    [board, turn, castling, enPassant, gameOver, aiDepth, addConsoleLine]
  );

  const printBoard = useCallback(() => {
    addConsoleLine('output', '');
    addConsoleLine('output', '    a   b   c   d   e   f   g   h');
    addConsoleLine('output', '  +---+---+---+---+---+---+---+---+');
    for (let r = 0; r < 8; r++) {
      let line = `${8 - r} |`;
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        line += ` ${p ? PIECES[p]?.symbol || '?' : '·'} |`;
      }
      line += ` ${8 - r}`;
      addConsoleLine('output', line);
      addConsoleLine('output', '  +---+---+---+---+---+---+---+---+');
    }
    addConsoleLine('output', '    a   b   c   d   e   f   g   h');
    addConsoleLine('output', `  Turn: ${turn === 'w' ? 'White' : 'Black'}  Moves: ${moveHistory.length}`);
    addConsoleLine('output', '');
  }, [board, turn, moveHistory, addConsoleLine]);

  return {
    board, turn, castling, enPassant, gameOver, moveHistory,
    moveCount, aiThinking, aiDepth, lastMove,
    setAiDepth, executeMove, printBoard, resetGame, setGameOver,
  };
}
