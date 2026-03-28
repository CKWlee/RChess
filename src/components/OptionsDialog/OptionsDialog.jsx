import React from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;
const SIDEBAR_ITEMS = ["General", "Code", "Appearance", "Packages", "R Markdown", "Sweave", "Spelling", "Git/SVN", "Publishing", "Terminal", "Accessibility"];

export default function OptionsDialog({ aiDepth, onDepthChange, onClose }) {
  const styles = COMPUTED_STYLES;
  return (
    <div style={styles.optionsOverlay} onClick={onClose}>
      <div style={styles.optionsDialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.optionsTitle}>Global Options</div>
        <div style={styles.optionsBody}>
          <div style={styles.optionsSidebar}>
            {SIDEBAR_ITEMS.map((item) => (
              <div key={item} style={item === "General" ? { ...styles.optionsSidebarItem, background: C.selection } : styles.optionsSidebarItem}>
                {item}
              </div>
            ))}
          </div>
          <div style={styles.optionsContent}>
            <div style={{ marginBottom: 16, fontWeight: 600, color: C.text }}>General</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, color: C.textLight, fontSize: 13 }}>
                Engine Analysis Depth (higher = stronger opponent):
              </label>
              <select
                value={aiDepth}
                onChange={(e) => onDepthChange(Number(e.target.value))}
                style={styles.optionsSelect}
              >
                <option value={1}>Depth 1 — Beginner (~600)</option>
                <option value={2}>Depth 2 — Novice (~700)</option>
                <option value={3}>Depth 3 — Casual (~800)</option>
                <option value={4}>Depth 4 — Intermediate (~1000)</option>
                <option value={5}>Depth 5 — Club (~1100)</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
              R version: 4.3.2 | Working directory: ~/lab_experiment_47
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
              Note: Higher depth values increase computation time significantly.
            </div>
          </div>
        </div>
        <div style={styles.optionsFooter}>
          <button style={styles.optionsBtn} onClick={onClose}>OK</button>
          <button style={{ ...styles.optionsBtn, background: "#FFFFFF" }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
