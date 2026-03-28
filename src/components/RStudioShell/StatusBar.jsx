import React from 'react';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

export default function StatusBar({ turn, moveHistory, aiDepth, memUsage, playerElo, authLabel, syncLabel, branch = 'main', sessionId = 'A17', buildTag = '0327a' }) {
  const styles = COMPUTED_STYLES;
  return (
    <div style={styles.statusBar}>
      <span>R 4.3.2</span>
      <span style={styles.statusSep}>|</span>
      <span>~/lab_experiment_47</span>
      <span style={styles.statusSep}>|</span>
      <span>{Math.round(memUsage)} MB</span>
      <div style={{ flex: 1 }} />
      <span>{turn === "w" ? "White" : "Black"} to move</span>
      <span style={styles.statusSep}>|</span>
      <span>Move {Math.ceil(moveHistory.length / 2) || 1}</span>
      <span style={styles.statusSep}>|</span>
      <span>Depth: {aiDepth}</span>
      <span style={styles.statusSep}>|</span>
      <span>Elo: {playerElo}</span>
      <span style={styles.statusSep}>|</span>
      <span>{authLabel}</span>
      <span style={styles.statusSep}>|</span>
      <span>{syncLabel}</span>
      <span style={styles.statusSep}>|</span>
      <span>git:{branch}</span>
      <span style={styles.statusSep}>|</span>
      <span>Session {sessionId}</span>
      <span style={styles.statusSep}>|</span>
      <span>UI {buildTag}</span>
      <span style={styles.statusSep}>|</span>
      <span>UTF-8</span>
      <span style={styles.statusSep}>|</span>
      <span>Ln 1, Col 1</span>
    </div>
  );
}
