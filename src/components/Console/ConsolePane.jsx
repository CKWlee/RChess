import React from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;
// prebuild line styles so long console histories don't keep reallocating style objects.
const LINE_STYLE_OUTPUT = COMPUTED_STYLES.consoleLine;
const LINE_STYLE_ERROR = { ...COMPUTED_STYLES.consoleLine, color: C.consoleError };
const LINE_STYLE_PROMPT = { ...COMPUTED_STYLES.consoleLine, color: C.consolePrompt };
const LINE_STYLES = { output: LINE_STYLE_OUTPUT, error: LINE_STYLE_ERROR, prompt: LINE_STYLE_PROMPT };
const MinimizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <line x1="1" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);
const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none"/>
  </svg>
);
const RestoreIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <rect x="0" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
    <polyline points="3,2.5 3,0.5 9.5,0.5 9.5,7 7,7" stroke="currentColor" strokeWidth="1" fill="none"/>
  </svg>
);

export default function ConsolePane({
  consoleLines, consoleInput, onInputChange, onKeyDown,
  aiThinking, onFocusConsole, inputRef, consoleEndRef,
  onContextMenu, maximized, onMaximize, onMinimize, bossMode,
}) {
  const styles = COMPUTED_STYLES;
  return (
    <div style={{ ...styles.pane, flex: 1 }} onContextMenu={onContextMenu}>
      <div style={styles.paneTabs}>
        <div style={{ ...styles.paneTab, ...styles.paneTabActive }}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginRight: 4 }}>
            <polygon points="2,2 6,6 2,10" fill="#2780E3"/>
          </svg>
          Console
        </div>
        <div style={styles.paneTab}>Terminal</div>
        <div style={styles.paneTab}>Background Jobs</div>
        <div style={{ flex: 1 }} />
        <div style={styles.paneButtons}>
          <button
            style={styles.paneMinMaxBtn}
            onClick={onMinimize}
            title="Minimize"
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <MinimizeIcon />
          </button>
          <button
            style={styles.paneMinMaxBtn}
            onClick={onMaximize}
            title={maximized ? "Restore" : "Maximize"}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {maximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
        </div>
      </div>
      <div style={styles.consoleContent} onClick={onFocusConsole}>
        {consoleLines.map((line, i) => (
          <div key={i} style={LINE_STYLES[line.type] || LINE_STYLE_OUTPUT}>
            {line.text}
          </div>
        ))}
        {aiThinking && (
          <div style={{ ...styles.consoleLine, color: C.textMuted, fontStyle: "italic" }}>
            # Engine computing...
          </div>
        )}
        <div style={styles.consoleInputLine}>
          <span style={{ color: C.consolePrompt }}>&gt; </span>
          <input
            ref={inputRef}
            value={consoleInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={styles.consoleInput}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div ref={consoleEndRef} />
      </div>

      <div style={styles.consoleWdBar}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginRight: 4 }}>
          <path d="M1 2.5h3l0.8-1.2h3.2l0.8 1.2H9v5.5H1V2.5z" fill="none" stroke={C.textMuted} strokeWidth="0.8"/>
        </svg>
        {bossMode ? '~/fuel_economy_analysis' : '~/lab_experiment_47'}
      </div>
    </div>
  );
}
