
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isConfigured } from './config.js';

const COLLECTION = 'players';
const LOCAL_KEY = 'stealthchess_player';
function defaultProfile(uid, displayName) {
  return {
    uid,
    displayName: displayName || 'Anonymous',
    elo: 400,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    peakElo: 400,
    gameHistory: [],
    createdAt: new Date().toISOString(),
  };
}

function getLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setLocal(profile) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
  } catch {  }
}

export async function getOrCreatePlayer(uid, displayName) {
  if (isConfigured && db && uid !== 'local') {
    try {
      const ref = doc(db, COLLECTION, uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { profile: snap.data(), storage: 'cloud' };
      }
      const profile = defaultProfile(uid, displayName);
      await setDoc(ref, profile);
      return { profile, storage: 'cloud' };
    } catch (err) {
      console.error('[StealthChess] Firestore read error:', err.message);
    }
  }
  let profile = getLocal();
  if (!profile) {
    profile = defaultProfile('local', displayName || 'Player');
    setLocal(profile);
  }
  return { profile, storage: 'local' };
}

export async function recordGameResult(uid, update, currentProfile) {
  const { elo, delta, result, opponentElo, depth, moves, date } = update;

  const gameEntry = {
    result,
    eloBefore: currentProfile.elo,
    eloAfter: elo,
    delta,
    opponentElo,
    depth,
    moves: moves || 0,
    date: date || new Date().toISOString(),
  };

  const updated = {
    ...currentProfile,
    elo,
    gamesPlayed: currentProfile.gamesPlayed + 1,
    wins: currentProfile.wins + (result === 'win' ? 1 : 0),
    losses: currentProfile.losses + (result === 'loss' ? 1 : 0),
    draws: currentProfile.draws + (result === 'draw' ? 1 : 0),
    peakElo: Math.max(currentProfile.peakElo, elo),
    gameHistory: [...(currentProfile.gameHistory || []).slice(-49), gameEntry],
  };

  let storage = 'local';
  if (isConfigured && db && uid !== 'local') {
    try {
      const ref = doc(db, COLLECTION, uid);
      await updateDoc(ref, {
        elo: updated.elo,
        gamesPlayed: updated.gamesPlayed,
        wins: updated.wins,
        losses: updated.losses,
        draws: updated.draws,
        peakElo: updated.peakElo,
        gameHistory: updated.gameHistory,
      });
      storage = 'cloud';
    } catch (err) {
      console.error('[StealthChess] Firestore write error:', err.message);
    }
  }
  setLocal(updated);
  return { profile: updated, storage };
}

export function getWinRate(profile) {
  if (!profile || profile.gamesPlayed === 0) return '0%';
  return ((profile.wins / profile.gamesPlayed) * 100).toFixed(1) + '%';
}
