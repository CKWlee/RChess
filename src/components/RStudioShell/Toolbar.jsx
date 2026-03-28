import React from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;

export default function Toolbar({
  bossMode,
  savedFlash,
  onSave,
  firebaseEnabled,
  authReady,
  authBusy,
  isSignedIn,
  userLabel,
  playerElo,
  syncLabel,
  lastSyncAt,
  onSignIn,
  onSignOut,
}) {
  const styles = COMPUTED_STYLES;
  return (
    <div style={styles.toolbar}>
      <div style={styles.toolbarGroup}>
        <button style={styles.toolBtn} title="New File">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="1" stroke={C.textLight} strokeWidth="1.2" fill="none"/><line x1="4" y1="4" x2="10" y2="4" stroke={C.textLight} strokeWidth="0.8"/><line x1="4" y1="6" x2="10" y2="6" stroke={C.textLight} strokeWidth="0.8"/><line x1="4" y1="8" x2="8" y2="8" stroke={C.textLight} strokeWidth="0.8"/></svg>
        </button>
        <button style={styles.toolBtn} title="Open File">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 4h4l1-1.5h3L10 4h3v8H1V4z" stroke={C.textLight} strokeWidth="1.2" fill="none"/></svg>
        </button>
        <button
          style={styles.toolBtn}
          title="Save"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1" stroke={C.textLight} strokeWidth="1.2" fill="none"/><rect x="4" y="2" width="6" height="4" stroke={C.textLight} strokeWidth="0.8" fill="none"/><rect x="4" y="8" width="6" height="4" fill={C.borderLight}/></svg>
        </button>
        {savedFlash && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>Saved.</span>}
      </div>
      <div style={{ flex: 1 }} />
      <div style={styles.toolbarGroup}>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          Elo: {playerElo}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }} title={lastSyncAt ? `Last sync: ${new Date(lastSyncAt).toLocaleTimeString()}` : "No recent sync"}>
          {syncLabel}
        </span>
        {firebaseEnabled ? (
          <button
            style={{ ...styles.toolBtn, border: `1px solid ${C.borderLight}`, background: "#FFFFFF", marginLeft: 8 }}
            title={isSignedIn ? "Sign out" : "Sign in with Google"}
            onClick={(e) => {
              e.stopPropagation();
              if (authBusy || !authReady) return;
              if (isSignedIn) onSignOut();
              else onSignIn();
            }}
          >
            {authBusy || !authReady ? "Auth..." : isSignedIn ? "Sign out" : "Sign in"}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>Offline mode</span>
        )}
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isSignedIn ? userLabel : "Anonymous"}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted, marginRight: 8 }}>
          {bossMode ? "fuel_economy.Rproj" : "lab_experiment_47.Rproj"}
        </span>
      </div>
    </div>
  );
}
