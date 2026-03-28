import React, { useMemo, useState } from 'react';
import { theme, FONT_MONO } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;

const ENV_TABS = ["Environment", "History", "Connections"];

export default function EnvironmentPane({ activeTab, onTabChange, envData, cmdHistory, maximized, onMaximize, onMinimize }) {
  const styles = COMPUTED_STYLES;
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredEnvData = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const enriched = envData.map((item) => ({ ...item, size: String(item.value ?? '').length }));
    const visible = q ? enriched.filter((item) => item.name.toLowerCase().includes(q) || String(item.value).toLowerCase().includes(q)) : enriched;
    return [...visible].sort((a, b) => {
      if (sortBy === 'size') return b.size - a.size;
      return a.name.localeCompare(b.name);
    });
  }, [envData, filter, sortBy]);

  return (
    <div style={styles.pane}>
      <div style={styles.paneTabs}>
        {ENV_TABS.map((tab) => (
          <div
            key={tab}
            style={{ ...styles.paneTab, ...(activeTab === tab ? styles.paneTabActive : {}) }}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={styles.paneButtons}>
          <button
            style={styles.paneMinMaxBtn}
            onClick={onMinimize}
            title="Minimize"
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
          <button
            style={styles.paneMinMaxBtn}
            onClick={onMaximize}
            title={maximized ? "Restore" : "Maximize"}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {maximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="0" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="none"/>
                <polyline points="3,2.5 3,0.5 9.5,0.5 9.5,7 7,7" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      {activeTab === "Environment" && (
        <div style={styles.envContent}>
          <div style={styles.envToolbar}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="5" fill="none" stroke={C.textMuted} strokeWidth="1"/>
              <line x1="6" y1="3" x2="6" y2="9" stroke={C.textMuted} strokeWidth="1"/>
            </svg>
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>Global Environment</span>
            <div style={{ flex: 1 }} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter"
              style={{ width: 84, fontSize: 11, border: `1px solid ${C.border}`, marginRight: 6, padding: '1px 4px' }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: 11, border: `1px solid ${C.border}`, marginRight: 6, padding: '1px 3px' }}
            >
              <option value="name">name</option>
              <option value="size">size</option>
            </select>
            <span style={{ fontSize: 10, color: C.textMuted }}>
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ verticalAlign: 'middle', marginRight: 2 }}>
                <rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke={C.textMuted} strokeWidth="1"/>
              </svg>
              List
            </span>
          </div>
          <div style={styles.envHeader}>
            <span style={{ flex: 1 }}>Name</span>
            <span style={{ width: 44, textAlign: 'right', paddingRight: 8 }}>Size</span>
            <span style={{ flex: 2 }}>Value</span>
          </div>
          {filteredEnvData.map((item, i) => (
            <div key={i} style={styles.envRow}>
              <span style={{ flex: 1, color: C.text, fontFamily: FONT_MONO, fontSize: 12 }}>{item.name}</span>
              <span style={{ width: 44, textAlign: 'right', paddingRight: 8, color: C.textMuted, fontFamily: FONT_MONO, fontSize: 11 }}>{item.size}</span>
              <span style={{ flex: 2, color: C.textLight, fontFamily: FONT_MONO, fontSize: 12 }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
      {activeTab === "History" && (
        <div style={styles.envContent}>
          {cmdHistory.slice(-15).map((cmd, i) => (
            <div key={i} style={{ padding: "2px 8px", fontFamily: FONT_MONO, fontSize: 12, color: C.text }}>{cmd}</div>
          ))}
        </div>
      )}
      {activeTab === "Connections" && (
        <div style={{ ...styles.envContent, padding: 16, color: C.textMuted, fontSize: 12 }}>
          <div>No connections available.</div>
          <div style={{ marginTop: 8 }}>Click <span style={{ color: C.accentDark }}>New Connection</span> to connect to a data source.</div>
        </div>
      )}
    </div>
  );
}
