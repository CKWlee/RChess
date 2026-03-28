import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  PIECES, createInitialBoard, deepCopy, pieceColor, isWhite,
  isInCheck, generateLegalMoves, indexToAlgebraic, algebraicToIndex,
} from "./engine/chess.js";
import { moveToSAN, parseSAN } from "./engine/san.js";
import { minimax, DEPTH_TO_ELO } from "./engine/ai.js";
import { calculateElo } from "./engine/elo.js";
import { isConfigured as firebaseEnabled } from "./firebase/config.js";
import { signInWithGoogle, logOut, onAuthChange } from "./firebase/auth.js";
import { getOrCreatePlayer, recordGameResult } from "./firebase/playerData.js";
import { SCRIPT_CONTENT, DATA_CLEANING_CONTENT, BOSS_SCRIPT, BOSS_DATA_CLEANING } from "./utils/fakeScripts.js";
import { COMPUTED_STYLES } from "./styles/appStyles.js";
import MenuBar from "./components/RStudioShell/MenuBar.jsx";
import Toolbar from "./components/RStudioShell/Toolbar.jsx";
import StatusBar from "./components/RStudioShell/StatusBar.jsx";
import OptionsDialog from "./components/OptionsDialog/OptionsDialog.jsx";
import ScriptEditor from "./components/ScriptEditor/ScriptEditor.jsx";
import ConsolePane from "./components/Console/ConsolePane.jsx";
import EnvironmentPane from "./components/EnvironmentPane/EnvironmentPane.jsx";
import PlotPane from "./components/PlotPane/PlotPane.jsx";
import ContextMenu, { EDITOR_CONTEXT_ITEMS, CONSOLE_CONTEXT_ITEMS } from "./components/ContextMenu/ContextMenu.jsx";
const BOSS_TABS = [
  { id: 'b1', name: 'fuel_economy.R', content: BOSS_SCRIPT, modified: false },
  { id: 'b2', name: 'model_diagnostics.R', content: BOSS_DATA_CLEANING, modified: false },
];

const MAX_ELO_DELTA = 24;
const RATING_THROTTLE_MS = 8000;
const CMD_HISTORY_KEY = "rchess_cmd_history";
const CONSOLE_COMPLETIONS = [
  'move("',
  "board()",
  "new_game()",
  "resign()",
  "help()",
  'source("correlation_analysis.R")',
];

const WINDOW_CHROME_STYLE = {
  height: 24,
  background: "#E5E5E5",
  borderBottom: "1px solid #D2D2D2",
  display: "flex",
  alignItems: "center",
  padding: "0 8px",
  fontSize: 11,
  color: "#666",
};

const WINDOW_DOT_COLORS = ["#FF5F56", "#FFBD2E", "#27C93F"];

export default function StealthChess() {
  // keep the chess state grouped so resets/new game don't miss a field.
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState("w");
  const [castling, setCastling] = useState("KQkq");
  const [enPassant, setEnPassant] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiDepth, setAiDepth] = useState(3);
  const [lastMove, setLastMove] = useState(null);

  // console is the fake shell UX, so we keep history/input separate from game state.
  const [consoleLines, setConsoleLines] = useState([
    { type: "output", text: "R version 4.3.2 (2023-10-31) -- \"Eye Holes\"" },
    { type: "output", text: 'Copyright (C) 2023 The R Foundation for Statistical Computing' },
    { type: "output", text: "Platform: x86_64-pc-linux-gnu (64-bit)" },
    { type: "output", text: "" },
    { type: "output", text: 'Type "help()" for help, "board()" to view position.' },
    { type: "output", text: 'Use move("e4") for standard notation. Type help() for full guide.' },
    { type: "output", text: "" },
  ]);
  const [consoleInput, setConsoleInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const consoleEndRef = useRef(null);
  const inputRef = useRef(null);

  // these toggles drive the RStudio mask and pane behavior.
  const [bossMode, setBossMode] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState("Plots");
  const [activeEnvTab, setActiveEnvTab] = useState("Environment");
  const [hoveredCell, setHoveredCell] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [memUsage, setMemUsage] = useState(247);

  // profile/auth live here because rating writes need both user identity and local fallback.
  const [authUser, setAuthUser] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [eloRecordedForGame, setEloRecordedForGame] = useState(false);
  const [syncMode, setSyncMode] = useState("local");
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [editorWrap, setEditorWrap] = useState(false);
  const [highlightLine, setHighlightLine] = useState(true);
  const [showSecretGuide, setShowSecretGuide] = useState(false);
  const lastRatedAtRef = useRef(0);
  const [leftWidthPct, setLeftWidthPct] = useState(50);
  const [leftSplitPct, setLeftSplitPct] = useState(55);
  const [rightSplitPct, setRightSplitPct] = useState(45);
  const draggingRef = useRef(null);
  const mainAreaRef = useRef(null);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);
  const [editorState, setEditorState] = useState({
    tabs: [
      { id: 1, name: 'correlation_analysis.R', content: SCRIPT_CONTENT, modified: false },
      { id: 2, name: 'data_cleaning.R', content: DATA_CLEANING_CONTENT, modified: false },
    ],
    activeId: 1,
    nextId: 3,
  });
  const [bossActiveTabId, setBossActiveTabId] = useState('b1');
  const [maximizedPane, setMaximizedPane] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // auto-scroll so fresh engine output is visible without manual scroll juggling.
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [consoleLines]);

  // stash command history locally so reloads still feel like one long terminal session.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CMD_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCmdHistory(parsed.slice(-200));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CMD_HISTORY_KEY, JSON.stringify(cmdHistory.slice(-200)));
    } catch {}
  }, [cmdHistory]);

  // random startup line sells the "real R session" vibe and breaks repeated boot sameness.
  useEffect(() => {
    const showPackageLine = Math.random() < 0.45;
    if (!showPackageLine) return;
    const timer = setTimeout(() => {
      setConsoleLines((prev) => {
        const next = [...prev, { type: "output", text: "Loading required package: corrplot" }];
        return next.length > 500 ? next.slice(-500) : next;
      });
    }, 650);
    return () => clearTimeout(timer);
  }, []);

  // tiny memory drift keeps the status bar from looking frozen/static.
  useEffect(() => {
    const iv = setInterval(() => {
      setMemUsage((m) => Math.max(200, Math.min(800, m + (Math.random() - 0.48) * 15)));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // keep these global so shortcut works even when focus is inside editor/input fields.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setBossMode((b) => !b);
        setMaximizedPane(null);
        setShowSecretGuide(false);
      }
      const isQuickGuideShortcut =
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "/" || e.key === "?" || e.code === "Slash");
      if (isQuickGuideShortcut) {
        e.preventDefault();
        setShowSecretGuide((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const handleMouseMove = (e) => {
      const drag = draggingRef.current;
      if (!drag) return;
      e.preventDefault();

      if (drag === 'vertical' && mainAreaRef.current) {
        const rect = mainAreaRef.current.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setLeftWidthPct(Math.min(80, Math.max(20, pct)));
      } else if (drag === 'leftH' && leftColRef.current) {
        const rect = leftColRef.current.getBoundingClientRect();
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        setLeftSplitPct(Math.min(85, Math.max(15, pct)));
      } else if (drag === 'rightH' && rightColRef.current) {
        const rect = rightColRef.current.getBoundingClientRect();
        const pct = ((e.clientY - rect.top) / rect.height) * 100;
        setRightSplitPct(Math.min(85, Math.max(15, pct)));
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = useCallback((type) => {
    draggingRef.current = type;
    document.body.style.cursor = type === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);
  const handleTabSelect = useCallback((tabId) => {
    if (bossMode) {
      setBossActiveTabId(tabId);
    } else {
      setEditorState(prev => ({ ...prev, activeId: tabId }));
    }
  }, [bossMode]);

  const handleTabClose = useCallback((tabId) => {
    setEditorState(prev => {
      const filtered = prev.tabs.filter(t => t.id !== tabId);
      if (filtered.length === 0) return prev;
      let activeId = prev.activeId;
      if (activeId === tabId) {
        const closedIdx = prev.tabs.findIndex(t => t.id === tabId);
        activeId = filtered[Math.min(closedIdx, filtered.length - 1)].id;
      }
      return { ...prev, tabs: filtered, activeId };
    });
  }, []);

  const handleTabAdd = useCallback(() => {
    setEditorState(prev => {
      const newId = prev.nextId;
      const newTab = { id: newId, name: `Untitled${newId > 3 ? newId - 2 : ''}.R`, content: '# New R Script\n\n', modified: false };
      return { tabs: [...prev.tabs, newTab], activeId: newId, nextId: newId + 1 };
    });
  }, []);

  const handleTabContentChange = useCallback((tabId, content) => {
    setEditorState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === tabId ? { ...t, content, modified: true } : t),
    }));
  }, []);
  const handleMaximize = useCallback((pane) => {
    setMaximizedPane(prev => prev === pane ? null : pane);
  }, []);
  const handleEditorContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, items: EDITOR_CONTEXT_ITEMS });
  }, []);

  const handleConsoleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, items: CONSOLE_CONTEXT_ITEMS });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const insertPipe = useCallback(() => {
    if (bossMode) return;
    setEditorState(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === prev.activeId ? { ...t, content: `${t.content}%>%\n`, modified: true } : t),
    }));
  }, [bossMode]);
  const focusConsole = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const addConsoleLine = useCallback((type, text) => {
    setConsoleLines((prev) => {
      const next = [...prev, { type, text }];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  const addConsoleLines = useCallback((lines) => {
    setConsoleLines((prev) => {
      const next = [...prev, ...lines];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);
  useEffect(() => {
    let mounted = true;

    getOrCreatePlayer("local", "Anonymous")
      .then(({ profile, storage }) => {
        if (!mounted) return;
        setPlayerProfile(profile);
        setSyncMode(storage);
        if (storage === "cloud") setLastSyncAt(Date.now());
      })
      .catch(() => {
        if (!mounted) return;
        addConsoleLine("error", "Error: failed to load local player profile.");
      });

    const unsubscribe = onAuthChange(async (user) => {
      if (!mounted) return;
      setAuthUser(user);
      try {
        const uid = user?.uid || "local";
        const name = user?.displayName || "Anonymous";
        const { profile, storage } = await getOrCreatePlayer(uid, name);
        if (!mounted) return;
        setPlayerProfile(profile);
        setSyncMode(storage);
        if (storage === "cloud") setLastSyncAt(Date.now());
      } catch {
        if (!mounted) return;
        addConsoleLine("error", "Error: failed to load player profile.");
      } finally {
        if (mounted) setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [addConsoleLine]);
  useEffect(() => {
    if (!gameOver || eloRecordedForGame || !playerProfile) return;

    const persistResult = async () => {
      const now = Date.now();
      if (now - lastRatedAtRef.current < RATING_THROTTLE_MS) {
        addConsoleLine("error", "Error: rating update throttled. Please wait a few seconds before another rated result.");
        setEloRecordedForGame(true);
        return;
      }

      const resultScore = gameOver === "white" ? 1 : gameOver === "draw" ? 0.5 : 0;
      const resultLabel = gameOver === "white" ? "win" : gameOver === "draw" ? "draw" : "loss";
      const opponentElo = DEPTH_TO_ELO[aiDepth] || 800;
      const { delta } = calculateElo(playerProfile.elo, opponentElo, resultScore);
      const clampedDelta = Math.max(-MAX_ELO_DELTA, Math.min(MAX_ELO_DELTA, delta));
      const safeNewElo = Math.max(100, playerProfile.elo + clampedDelta);

      try {
        const uid = authUser?.uid || "local";
        const { profile: updated, storage } = await recordGameResult(
          uid,
          {
            elo: safeNewElo,
            delta: clampedDelta,
            result: resultLabel,
            opponentElo,
            depth: aiDepth,
            moves: moveHistory.length,
            date: new Date().toISOString(),
          },
          playerProfile
        );
        setPlayerProfile(updated);
        setSyncMode(storage);
        setLastSyncAt(Date.now());
        lastRatedAtRef.current = Date.now();
        const sign = clampedDelta >= 0 ? "+" : "";
        const syncLabel = storage === "cloud" ? "Cloud" : "Local";
        addConsoleLine(
          "output",
          `[1] "Rating update: ${playerProfile.elo} -> ${updated.elo} (${sign}${clampedDelta}) vs depth ${aiDepth} (~${opponentElo}) [${syncLabel}]"`
        );
      } catch {
        addConsoleLine("error", "Error: could not persist rating update.");
      } finally {
        setEloRecordedForGame(true);
      }
    };

    persistResult();
  }, [
    gameOver,
    eloRecordedForGame,
    playerProfile,
    aiDepth,
    authUser,
    moveHistory.length,
    addConsoleLine,
  ]);
  const executeMove = useCallback(
    (moveStr) => {
      if (gameOver) {
        addConsoleLine("error", "Error: Game is over. Type new_game() to start a new game.");
        return;
      }
      if (turn !== "w") {
        addConsoleLine("error", "Error: Wait for engine response.");
        return;
      }

      const cleaned = moveStr.replace(/['"]/g, "").trim();
      if (cleaned.length === 0) {
        addConsoleLine("error", `Error in move("${moveStr}") : Empty move. Type help() for usage.`);
        return;
      }

      const legalMoves = generateLegalMoves(board, "w", castling, enPassant);
      let legal = parseSAN(cleaned, legalMoves, board, "w");
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
          if (!legal && coordMatch[1] && coordMatch[2]) {
            legal = legalMoves.find(
              (m) => m.from.row === from.row && m.from.col === from.col &&
                     m.to.row === to.row && m.to.col === to.col
            );
          }
        }
      }

      if (!legal) {
        addConsoleLine("error", `Error in move("${moveStr}") : Illegal or unrecognized move. Type help() for notation guide.`);
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
      if (piece.toUpperCase() === "P" && to.col !== from.col && !captured) {
        newBoard[from.row][to.col] = null;
      }
      if (piece === "K" && Math.abs(to.col - from.col) === 2) {
        if (to.col === 6) { newBoard[7][5] = "R"; newBoard[7][7] = null; }
        if (to.col === 2) { newBoard[7][3] = "R"; newBoard[7][0] = null; }
      }
      const promoPiece = legal.promotion || piece;
      newBoard[to.row][to.col] = promoPiece;
      newBoard[from.row][from.col] = null;
      if (piece === "K") newCastling = newCastling.replace(/[KQ]/g, "");
      if (piece === "R" && from.col === 0 && from.row === 7) newCastling = newCastling.replace("Q", "");
      if (piece === "R" && from.col === 7 && from.row === 7) newCastling = newCastling.replace("K", "");
      if (to.row === 0 && to.col === 0) newCastling = newCastling.replace("q", "");
      if (to.row === 0 && to.col === 7) newCastling = newCastling.replace("k", "");
      if (to.row === 7 && to.col === 0) newCastling = newCastling.replace("Q", "");
      if (to.row === 7 && to.col === 7) newCastling = newCastling.replace("K", "");
      if (piece.toUpperCase() === "P" && Math.abs(to.row - from.row) === 2) {
        newEnPassant = { row: (from.row + to.row) / 2, col: from.col };
      }

      const fromSq = indexToAlgebraic(from.row, from.col);
      const toSq = indexToAlgebraic(to.row, to.col);

      setBoard(newBoard);
      setCastling(newCastling);
      setEnPassant(newEnPassant);
      setTurn("b");
      setLastMove({ from: fromSq, to: toSq });
      setMoveHistory((h) => [...h, san]);

      addConsoleLine("output", `[1] "${san}"`);
      setRendering(true);
      setTimeout(() => setRendering(false), 400);
      const blackMoves = generateLegalMoves(newBoard, "b", newCastling, newEnPassant);
      if (blackMoves.length === 0) {
        if (isInCheck(newBoard, "b")) {
          addConsoleLine("output", '[1] "Checkmate! White wins."');
          setGameOver("white");
        } else {
          addConsoleLine("output", '[1] "Stalemate. Draw."');
          setGameOver("draw");
        }
        return;
      }
      setAiThinking(true);
      setTimeout(() => {
        const aiLegalMoves = generateLegalMoves(newBoard, "b", newCastling, newEnPassant);
        const result = minimax(newBoard, aiDepth, -Infinity, Infinity, false, newCastling, newEnPassant);
        if (result.move) {
          const m = result.move;
          const aiSan = moveToSAN(newBoard, m, aiLegalMoves, newCastling, newEnPassant);

          const aiBoard = deepCopy(newBoard);
          const aiPiece = aiBoard[m.from.row][m.from.col];
          const aiCaptured = aiBoard[m.to.row][m.to.col];
          if (aiPiece.toUpperCase() === "P" && m.to.col !== m.from.col && !aiCaptured) {
            aiBoard[m.from.row][m.to.col] = null;
          }
          if (aiPiece === "k" && Math.abs(m.to.col - m.from.col) === 2) {
            if (m.to.col === 6) { aiBoard[0][5] = "r"; aiBoard[0][7] = null; }
            if (m.to.col === 2) { aiBoard[0][3] = "r"; aiBoard[0][0] = null; }
          }

          let updatedCastling = newCastling;
          if (aiPiece === "k") updatedCastling = updatedCastling.replace(/[kq]/g, "");
          if (aiPiece === "r" && m.from.col === 0 && m.from.row === 0) updatedCastling = updatedCastling.replace("q", "");
          if (aiPiece === "r" && m.from.col === 7 && m.from.row === 0) updatedCastling = updatedCastling.replace("k", "");
          if (m.to.row === 7 && m.to.col === 0) updatedCastling = updatedCastling.replace("Q", "");
          if (m.to.row === 7 && m.to.col === 7) updatedCastling = updatedCastling.replace("K", "");

          const promoPiece2 = m.promotion || aiPiece;
          aiBoard[m.to.row][m.to.col] = promoPiece2;
          aiBoard[m.from.row][m.from.col] = null;

          let newEp2 = null;
          if (aiPiece.toUpperCase() === "P" && Math.abs(m.to.row - m.from.row) === 2) {
            newEp2 = { row: (m.from.row + m.to.row) / 2, col: m.from.col };
          }

          const aiFromAlg = indexToAlgebraic(m.from.row, m.from.col);
          const aiToAlg = indexToAlgebraic(m.to.row, m.to.col);

          setBoard(aiBoard);
          setCastling(updatedCastling);
          setEnPassant(newEp2);
          setTurn("w");
          setLastMove({ from: aiFromAlg, to: aiToAlg });
          setMoveHistory((h) => [...h, aiSan]);

          addConsoleLine("output", `[1] "Engine: ${aiSan}"`);

          setRendering(true);
          setTimeout(() => setRendering(false), 400);
          const whiteMoves = generateLegalMoves(aiBoard, "w", updatedCastling, newEp2);
          if (whiteMoves.length === 0) {
            if (isInCheck(aiBoard, "w")) {
              addConsoleLine("output", '[1] "Checkmate! Black wins."');
              setGameOver("black");
            } else {
              addConsoleLine("output", '[1] "Stalemate. Draw."');
              setGameOver("draw");
            }
          }
        }
        setAiThinking(false);
      }, 600 + Math.random() * 800);
    },
    [board, turn, castling, enPassant, gameOver, aiDepth, addConsoleLine]
  );
  const printBoard = useCallback(() => {
    const out = [{ type: "output", text: "" }];
    out.push({ type: "output", text: "    a   b   c   d   e   f   g   h" });
    out.push({ type: "output", text: "  +---+---+---+---+---+---+---+---+" });
    for (let r = 0; r < 8; r++) {
      let line = `${8 - r} |`;
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        line += ` ${p ? PIECES[p]?.symbol || "?" : "·"} |`;
      }
      line += ` ${8 - r}`;
      out.push({ type: "output", text: line });
      out.push({ type: "output", text: "  +---+---+---+---+---+---+---+---+" });
    }
    out.push({ type: "output", text: "    a   b   c   d   e   f   g   h" });
    out.push({ type: "output", text: `  Turn: ${turn === "w" ? "White" : "Black"}  Moves: ${moveHistory.length}` });
    out.push({ type: "output", text: "" });
    addConsoleLines(out);
  }, [board, turn, moveHistory, addConsoleLines]);
  const handleCommand = useCallback(
    (cmd) => {
      addConsoleLine("prompt", `> ${cmd}`);
      setCmdHistory((h) => [...h, cmd]);
      setHistoryIdx(-1);

      const trimmed = cmd.trim();
      const moveMatch = trimmed.match(/^move\s*\(\s*["']?(.+?)["']?\s*\)/i);
      if (moveMatch) {
        executeMove(moveMatch[1]);
        return;
      }

      if (trimmed === "board()" || trimmed === "board") {
        printBoard();
        return;
      }

      if (trimmed === "new_game()" || trimmed === "new_game") {
        setBoard(createInitialBoard());
        setTurn("w");
        setCastling("KQkq");
        setEnPassant(null);
        setGameOver(null);
        setEloRecordedForGame(false);
        setMoveHistory([]);
        setLastMove(null);
        addConsoleLine("output", '[1] "New game started. White to move."');
        setRendering(true);
        setTimeout(() => setRendering(false), 400);
        return;
      }

      if (trimmed === "resign()" || trimmed === "resign") {
        addConsoleLine("output", '[1] "You resigned. Black wins."');
        setGameOver("black");
        return;
      }

      if (trimmed === "help()" || trimmed === "help") {
        addConsoleLines([
          { type: "output", text: "" },
          { type: "output", text: "StealthChess — R Console Interface" },
          { type: "output", text: "" },
          { type: "output", text: "Usage:" },
          { type: "output", text: '  move("e4")     Make a move using standard algebraic notation' },
          { type: "output", text: "  board()        Display current board position" },
          { type: "output", text: "  new_game()     Start a new game" },
          { type: "output", text: "  resign()       Resign current game" },
          { type: "output", text: "  help()         Show this help message" },
          { type: "output", text: "" },
          { type: "output", text: "Standard Algebraic Notation (SAN):" },
          { type: "output", text: '  Pawn moves:    move("e4"), move("d5"), move("exd5")' },
          { type: "output", text: '  Pieces:        move("Nf3"), move("Bb5"), move("Qd1")' },
          { type: "output", text: '  Captures:      move("Bxe5"), move("Nxd4"), move("exd5")' },
          { type: "output", text: '  Castling:      move("O-O")  (kingside), move("O-O-O") (queenside)' },
          { type: "output", text: '  Promotion:     move("e8=Q"), move("d1=R")' },
          { type: "output", text: '  Disambig:      move("Rae1"), move("R1e1"), move("Qh4e1")' },
          { type: "output", text: "" },
          { type: "output", text: "  Coordinate notation also works: move(\"e2e4\"), move(\"g1f3\")" },
          { type: "output", text: "" },
          { type: "output", text: "  Piece letters: K=King, Q=Queen, R=Rook, B=Bishop, N=Knight" },
          { type: "output", text: "  (Pawns have no letter prefix)" },
          { type: "output", text: "" },
          { type: "output", text: "Press Esc to toggle boss mode. Tools > Global Options for difficulty." },
          { type: "output", text: "Secret: Press Ctrl+Shift+/ for analyst quick reference." },
          { type: "output", text: "" },
        ]);
        return;
      }
      if (trimmed === ".rs_help()" || trimmed === ".rs_help") {
        addConsoleLines([
          { type: "output", text: "[rchess] quick commands" },
          { type: "output", text: '  move("e4")  board()  new_game()  resign()  help()' },
          { type: "output", text: '  source("correlation_analysis.R")' },
          { type: "output", text: '  secret overlay: Ctrl+Shift+/' },
          { type: "output", text: "" },
        ]);
        return;
      }
      if (trimmed === "source(\"correlation_analysis.R\")" || trimmed === "source('correlation_analysis.R')") {
        addConsoleLines([
          { type: "output", text: "" },
          { type: "output", text: "         temp pressure humidity    pH viscosity density flow_rate  yield" },
          { type: "output", text: "temp      1.00   -0.03     0.05 -0.01      0.02   -0.04      0.08   0.58" },
          { type: "output", text: "pressure -0.03    1.00     0.01  0.06     -0.02    0.03      0.42  -0.31" },
          { type: "output", text: "humidity  0.05    0.01     1.00 -0.02      0.01   -0.01     -0.22   0.04" },
          { type: "output", text: "pH       -0.01    0.06    -0.02  1.00      0.04    0.02      0.03  -0.02" },
          { type: "output", text: "viscosity 0.02   -0.02     0.01  0.04      1.00    0.07     -0.01   0.01" },
          { type: "output", text: "density  -0.04    0.03    -0.01  0.02      0.07    1.00      0.02  -0.03" },
          { type: "output", text: "flow_rate 0.08    0.42    -0.22  0.03     -0.01    0.02      1.00  -0.12" },
          { type: "output", text: "yield     0.58   -0.31     0.04 -0.02      0.01   -0.03     -0.12   1.00" },
          { type: "output", text: "" },
          { type: "output", text: "p-value (temp ~ yield): 2.41e-19" },
          { type: "output", text: "" },
          { type: "output", text: "--- Summary Statistics ---" },
          { type: "output", text: "Observations: 200" },
          { type: "output", text: "Variables: 8" },
          { type: "output", text: "Strongest correlation: 0.58" },
        ]);
        return;
      }
      if (trimmed.length > 0) {
        const rawSAN = trimmed.match(/^([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?|0-0(?:-0)?)$/);
        const rawCoord = trimmed.match(/^([a-h][1-8][a-h][1-8][qrbn]?)$/i);
        if (rawSAN || rawCoord) {
          addConsoleLine("output", `Hint: Use move("${trimmed}") to make a move.`);
          return;
        }
        addConsoleLine("error", `Error: object '${trimmed.split("(")[0].split(" ")[0]}' not found`);
      }
    },
    [executeMove, printBoard, addConsoleLine, addConsoleLines]
  );

  const handleConsoleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (consoleInput.trim()) handleCommand(consoleInput);
      setConsoleInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx;
        setHistoryIdx(newIdx);
        setConsoleInput(cmdHistory[cmdHistory.length - 1 - newIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        setHistoryIdx(historyIdx - 1);
        setConsoleInput(cmdHistory[cmdHistory.length - historyIdx] || "");
      } else {
        setHistoryIdx(-1);
        setConsoleInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = CONSOLE_COMPLETIONS.find((c) => c.startsWith(consoleInput));
      if (match) setConsoleInput(match);
    }
  }, [consoleInput, cmdHistory, historyIdx, handleCommand]);
  const envData = useMemo(() => {
    const pieceCount = { w: 0, b: 0 };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieceCount[pieceColor(p)]++;
    }
    return [
      { name: "board_state", type: "matrix", value: `int [1:8, 1:8] ${board[0].map(p => p ? (isWhite(p) ? '1' : '-1') : '0').join(' ')} ...` },
      { name: "correlation_matrix", type: "matrix", value: "num [1:8, 1:8] 1 -0.03 0.05 ..." },
      { name: "experiment_df", type: "data.frame", value: `200 obs. of 8 variables` },
      { name: "n_obs", type: "numeric", value: "200" },
      { name: "p_value", type: "numeric", value: "2.41e-19" },
      { name: "player_elo", type: "numeric", value: String(playerProfile?.elo ?? 400) },
      { name: "player_mode", type: "character", value: authUser ? "Google" : "Anonymous" },
      { name: "sync_mode", type: "character", value: syncMode === "cloud" ? "Cloud" : "Local cache" },
      { name: "model", type: "list", value: `List of ${pieceCount.w + pieceCount.b}` },
    ];
  }, [board, playerProfile, authUser, syncMode]);
  const displayTabs = bossMode ? BOSS_TABS : editorState.tabs;
  const displayActiveTabId = bossMode ? bossActiveTabId : editorState.activeId;
  const handleSave = useCallback(() => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    if (!bossMode) {
      setEditorState(prev => ({
        ...prev,
        tabs: prev.tabs.map(t => t.id === prev.activeId ? { ...t, modified: false } : t),
      }));
    }
  }, [bossMode]);

  const handleSignIn = useCallback(async () => {
    if (!firebaseEnabled || authBusy) return;
    setAuthBusy(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        addConsoleLine("output", `[1] "Signed in as ${user.displayName || user.email || "user"}."`);
      } else {
        addConsoleLine("error", "Error: sign-in cancelled or failed.");
      }
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy, addConsoleLine]);

  const handleSignOut = useCallback(async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await logOut();
      addConsoleLine("output", '[1] "Signed out. Continuing as Anonymous."');
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy, addConsoleLine]);
  const handleRunScript = useCallback(() => {
    handleCommand(bossMode ? 'source("fuel_economy.R")' : 'source("correlation_analysis.R")');
  }, [bossMode, handleCommand]);

  const toggleEditorWrap = useCallback(() => setEditorWrap((v) => !v), []);
  const toggleHighlightLine = useCallback(() => setHighlightLine((v) => !v), []);

  const styles = COMPUTED_STYLES;
  const showLeftCol = !maximizedPane || maximizedPane === 'editor' || maximizedPane === 'console';
  const showRightCol = !maximizedPane || maximizedPane === 'env' || maximizedPane === 'plot';
  const showEditor = !maximizedPane || maximizedPane === 'editor';
  const showConsole = !maximizedPane || maximizedPane === 'console';
  const showEnv = !maximizedPane || maximizedPane === 'env';
  const showPlot = !maximizedPane || maximizedPane === 'plot';

  if (showOptions) {
    return (
      <OptionsDialog
        aiDepth={aiDepth}
        onDepthChange={setAiDepth}
        onClose={() => setShowOptions(false)}
      />
    );
  }

  return (
    <div style={styles.root} onClick={focusConsole}>
      <div style={WINDOW_CHROME_STYLE}>
        <div style={{ display: "flex", gap: 6, marginRight: 8 }}>
          {WINDOW_DOT_COLORS.map((color) => (
            <span key={color} style={{ width: 10, height: 10, borderRadius: 99, background: color, display: "inline-block" }} />
          ))}
        </div>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {bossMode ? "fuel_economy.R - RStudio" : "correlation_analysis.R - RStudio"}
        </span>
      </div>
      <MenuBar bossMode={bossMode} onOpenOptions={() => setShowOptions(true)} />
      <Toolbar
        bossMode={bossMode}
        savedFlash={savedFlash}
        onSave={handleSave}
        firebaseEnabled={firebaseEnabled}
        authReady={authReady}
        authBusy={authBusy}
        isSignedIn={!!authUser}
        userLabel={authUser?.displayName || authUser?.email || "Anonymous"}
        playerElo={playerProfile?.elo ?? 400}
        syncLabel={syncMode === "cloud" ? "Cloud synced" : "Local cache"}
        lastSyncAt={lastSyncAt}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <div style={styles.mainArea} ref={mainAreaRef}>

        {showLeftCol && (
          <div
            ref={leftColRef}
            style={{
              ...styles.leftCol,
              width: showRightCol ? `calc(${leftWidthPct}% - 3px)` : '100%',
              flex: 'none',
            }}
          >

            {showEditor && (
              <div style={{ flex: showConsole ? leftSplitPct : 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ScriptEditor
                  tabs={displayTabs}
                  activeTabId={displayActiveTabId}
                  onTabSelect={handleTabSelect}
                  onTabClose={handleTabClose}
                  onTabAdd={handleTabAdd}
                  onTabContentChange={handleTabContentChange}
                  onRunScript={handleRunScript}
                  onInsertPipe={insertPipe}
                  editorWrap={editorWrap}
                  onToggleWrap={toggleEditorWrap}
                  highlightLine={highlightLine}
                  onToggleHighlight={toggleHighlightLine}
                  onContextMenu={handleEditorContextMenu}
                  maximized={maximizedPane === 'editor'}
                  onMaximize={() => handleMaximize('editor')}
                  onMinimize={() => handleMaximize('console')}
                />
              </div>
            )}

            {showEditor && showConsole && (
              <div
                style={styles.splitterH}
                onMouseDown={() => startDrag('leftH')}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#B0B0B0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = styles.splitterH.background)}
              />
            )}

            {showConsole && (
              <div style={{ flex: showEditor ? (100 - leftSplitPct) : 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <ConsolePane
                  consoleLines={consoleLines}
                  consoleInput={consoleInput}
                  onInputChange={setConsoleInput}
                  onKeyDown={handleConsoleKeyDown}
                  aiThinking={aiThinking}
                  onFocusConsole={focusConsole}
                  inputRef={inputRef}
                  consoleEndRef={consoleEndRef}
                  onContextMenu={handleConsoleContextMenu}
                  maximized={maximizedPane === 'console'}
                  onMaximize={() => handleMaximize('console')}
                  onMinimize={() => handleMaximize('editor')}
                  bossMode={bossMode}
                />
              </div>
            )}
          </div>
        )}

        {showLeftCol && showRightCol && (
          <div
            style={styles.splitterV}
            onMouseDown={() => startDrag('vertical')}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#B0B0B0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = styles.splitterV.background)}
          />
        )}

        {showRightCol && (
          <div
            ref={rightColRef}
            style={{
              ...styles.rightCol,
              width: showLeftCol ? `calc(${100 - leftWidthPct}% - 3px)` : '100%',
              flex: 'none',
            }}
          >

            {showEnv && (
              <div style={{ flex: showPlot ? rightSplitPct : 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <EnvironmentPane
                  activeTab={activeEnvTab}
                  onTabChange={setActiveEnvTab}
                  envData={envData}
                  cmdHistory={cmdHistory}
                  maximized={maximizedPane === 'env'}
                  onMaximize={() => handleMaximize('env')}
                  onMinimize={() => handleMaximize('plot')}
                />
              </div>
            )}

            {showEnv && showPlot && (
              <div
                style={styles.splitterH}
                onMouseDown={() => startDrag('rightH')}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#B0B0B0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = styles.splitterH.background)}
              />
            )}

            {showPlot && (
              <div style={{ flex: showEnv ? (100 - rightSplitPct) : 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <PlotPane
                  activeTab={activeRightTab}
                  onTabChange={setActiveRightTab}
                  rendering={rendering}
                  bossMode={bossMode}
                  board={board}
                  lastMove={lastMove}
                  hoveredCell={hoveredCell}
                  onHoverCell={setHoveredCell}
                  maximized={maximizedPane === 'plot'}
                  onMaximize={() => handleMaximize('plot')}
                  onMinimize={() => handleMaximize('env')}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <StatusBar
        turn={turn}
        moveHistory={moveHistory}
        aiDepth={aiDepth}
        memUsage={memUsage}
        playerElo={playerProfile?.elo ?? 400}
        authLabel={authUser ? "Google" : "Anonymous"}
        syncLabel={syncMode === "cloud" ? "Cloud" : "Local"}
        branch={bossMode ? "reporting" : "main"}
        sessionId={bossMode ? "B02" : "A17"}
        buildTag="0327a"
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}
      {showSecretGuide && (
        <div style={{ position: "fixed", right: 14, bottom: 34, width: 320, background: "#FFFFFF", border: "1px solid #C8C8C8", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", borderRadius: 4, padding: 10, zIndex: 5000, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Analyst Quick Reference</div>
          <div style={{ color: "#555", lineHeight: 1.45 }}>move("e4"), board(), new_game(), resign(), help()</div>
          <div style={{ color: "#555", marginTop: 6, lineHeight: 1.45 }}>source("correlation_analysis.R")</div>
          <div style={{ color: "#777", marginTop: 8, fontSize: 11 }}>toggle this panel: Ctrl+Shift+/</div>
        </div>
      )}
    </div>
  );
}
