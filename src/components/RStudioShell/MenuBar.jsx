import React from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;
const MENU_ITEMS = ["File", "Edit", "Code", "View", "Plots", "Session", "Build", "Debug", "Profile", "Tools", "Help"];

export default function MenuBar({ bossMode, onOpenOptions }) {
  const styles = COMPUTED_STYLES;
  return (
    <div style={styles.menuBar}>
      <div style={styles.menuLeft}>
        {MENU_ITEMS.map((item) => (
          <div
            key={item}
            style={styles.menuItem}
            onClick={(e) => {
              e.stopPropagation();
              if (item === "Tools") onOpenOptions();
            }}
            onMouseEnter={(e) => (e.target.style.background = C.hoverBg)}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            {item}
          </div>
        ))}
      </div>
      <div style={styles.menuRight}>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          {bossMode ? "fuel_economy_analysis" : "correlation_analysis"} - RStudio
        </span>
      </div>
    </div>
  );
}
