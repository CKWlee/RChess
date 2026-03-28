import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { theme, FONT_MONO, FONT_UI } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';
import HeatmapBoard from './HeatmapBoard.jsx';
import BossPlot from './BossPlot.jsx';

const C = theme;
const PLOT_TABS = ["Files", "Plots", "Packages", "Help", "Viewer"];

const FILES_LIST = [
  { icon: "📁", name: "data/", type: "dir" },
  { icon: "📁", name: "output/", type: "dir" },
  { icon: "📄", name: "correlation_analysis.R", size: "3.2 KB" },
  { icon: "📄", name: "data_cleaning.R", size: "1.8 KB" },
  { icon: "📄", name: "README.md", size: "0.5 KB" },
  { icon: "📊", name: "experiment_data.csv", size: "45.3 KB" },
  { icon: "📊", name: "lab_experiment_47.Rproj", size: "0.2 KB" },
  { icon: "📄", name: ".gitignore", size: "0.1 KB" },
];

const FILE_TREE = {
  data: [
    { icon: "📊", name: "experiment_data.csv", size: "45.3 KB" },
    { icon: "📄", name: "data_cleaning.R", size: "1.8 KB" },
  ],
  output: [
    { icon: "📄", name: "correlation_heatmap.png", size: "198 KB" },
    { icon: "📄", name: "model_notes.txt", size: "2.4 KB" },
  ],
};

const PACKAGES_LIST = [
  { name: "base", version: "4.3.2", checked: true },
  { name: "corrplot", version: "0.92", checked: true },
  { name: "datasets", version: "4.3.2", checked: true },
  { name: "dplyr", version: "1.1.4", checked: true },
  { name: "ggplot2", version: "3.4.4", checked: true },
  { name: "graphics", version: "4.3.2", checked: true },
  { name: "grDevices", version: "4.3.2", checked: true },
  { name: "methods", version: "4.3.2", checked: true },
  { name: "stats", version: "4.3.2", checked: true },
  { name: "stringr", version: "1.5.1", checked: false },
  { name: "tibble", version: "3.2.1", checked: false },
  { name: "tidyr", version: "1.3.0", checked: false },
  { name: "utils", version: "4.3.2", checked: true },
];

export default function PlotPane({
  activeTab, onTabChange, rendering, bossMode,
  board, lastMove, hoveredCell, onHoverCell,
  maximized, onMaximize, onMinimize,
}) {
  const styles = COMPUTED_STYLES;
  // keep this local so file/plot interactions stay snappy and don't churn App state.
  const [expandedDirs, setExpandedDirs] = useState({ data: true, output: false });
  const [selectedPath, setSelectedPath] = useState(null);
  const [plotHistory, setPlotHistory] = useState(["Session start"]);
  const [plotHistoryIndex, setPlotHistoryIndex] = useState(0);

  // tiny history labels make the pane feel alive without storing heavy plot snapshots.
  useEffect(() => {
    if (!lastMove || bossMode) return;
    setPlotHistory((prev) => {
      const next = [...prev.slice(-9), `Move ${lastMove.from}-${lastMove.to}`];
      setPlotHistoryIndex(next.length - 1);
      return next;
    });
  }, [lastMove, bossMode]);

  const plotLabel = useMemo(() => plotHistory[plotHistoryIndex] || "Session start", [plotHistory, plotHistoryIndex]);

  const toggleDir = useCallback((key) => {
    setExpandedDirs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div style={{ ...styles.pane, flex: 1.2 }}>
      <div style={styles.paneTabs}>
        {PLOT_TABS.map((tab) => (
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

      {activeTab === "Plots" && (
        <>
          <div style={{ height: 28, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, background: '#FAFAFA' }}>
            <button style={styles.editorBtn} disabled={plotHistoryIndex <= 0} onClick={() => setPlotHistoryIndex((i) => Math.max(0, i - 1))}>{'<'}</button>
            <button style={styles.editorBtn} disabled={plotHistoryIndex >= plotHistory.length - 1} onClick={() => setPlotHistoryIndex((i) => Math.min(plotHistory.length - 1, i + 1))}>{'>'}</button>
            <button style={styles.editorBtn}>Zoom</button>
            <button style={styles.editorBtn}>Export</button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: C.textMuted }}>{plotLabel}</span>
          </div>
          <div style={styles.plotContent}>
          {rendering && (
            <div style={styles.renderingOverlay}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>Rendering plot...</span>
            </div>
          )}
          {bossMode ? (
            <BossPlot />
          ) : (
            <HeatmapBoard
              board={board}
              lastMove={lastMove}
              hoveredCell={hoveredCell}
              setHoveredCell={onHoverCell}
              rendering={rendering}
            />
          )}
          </div>
        </>
      )}

      {activeTab === "Files" && (
        <div style={styles.filesContent}>
          <div style={styles.filesToolbar}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 3h4l1-1.5h3L10 3h1v7H1V3z" fill={C.toolbarBg} stroke={C.textMuted} strokeWidth="0.8"/></svg>
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>~/lab_experiment_47</span>
          </div>
          {FILES_LIST.slice(0, 2).map((f) => {
            const key = f.name.replace('/', '');
            return (
              <div key={f.name}>
                <div
                  style={{ ...styles.fileRow, cursor: 'pointer', background: selectedPath === f.name ? C.hoverBg : 'transparent' }}
                  onClick={() => { toggleDir(key); setSelectedPath(f.name); }}
                >
                  <span>{expandedDirs[key] ? '▾' : '▸'}</span>
                  <span style={{ marginLeft: 4 }}>{f.icon}</span>
                  <span style={{ flex: 1, marginLeft: 6, color: C.accentDark }}>{f.name}</span>
                </div>
                {expandedDirs[key] && (FILE_TREE[key] || []).map((child) => (
                  <div
                    key={`${key}-${child.name}`}
                    style={{ ...styles.fileRow, paddingLeft: 20, background: selectedPath === child.name ? C.hoverBg : 'transparent' }}
                    onClick={() => setSelectedPath(child.name)}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedPath(child.name); }}
                  >
                    <span>{child.icon}</span>
                    <span style={{ flex: 1, marginLeft: 6, color: C.text }}>{child.name}</span>
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{child.size || ""}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {FILES_LIST.slice(2).map((f, i) => (
            <div
              key={i}
              style={{ ...styles.fileRow, background: selectedPath === f.name ? C.hoverBg : 'transparent' }}
              onClick={() => setSelectedPath(f.name)}
              onContextMenu={(e) => { e.preventDefault(); setSelectedPath(f.name); }}
            >
              <span>{f.icon}</span>
              <span style={{ flex: 1, marginLeft: 6, color: f.type === "dir" ? C.accentDark : C.text }}>{f.name}</span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>{f.size || ""}</span>
            </div>
          ))}
          {selectedPath && (
            <div style={{ marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 6, paddingLeft: 8, fontSize: 11, color: C.textMuted }}>
              Rename | Copy Path | Delete
            </div>
          )}
        </div>
      )}

      {activeTab === "Packages" && (
        <div style={styles.packagesContent}>
          {PACKAGES_LIST.map((pkg, i) => (
            <div key={i} style={styles.packageRow}>
              <input type="checkbox" defaultChecked={pkg.checked} style={{ marginRight: 8 }} />
              <span style={{ flex: 1, fontFamily: FONT_MONO, fontSize: 12, color: C.text }}>{pkg.name}</span>
              <span style={{ color: C.textMuted, fontSize: 11 }}>{pkg.version}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Help" && (
        <div style={{ padding: 12, fontSize: 12, color: C.text, overflowY: "auto", flex: 1, fontFamily: FONT_UI }}>
          <div style={{ fontWeight: 700, fontSize: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 8 }}>
            R Help
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>corrplot {'{'}corrplot{'}'}</div>
          <div style={{ marginBottom: 8, color: C.textLight }}>A visualization of a correlation matrix.</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Description</div>
          <div style={{ color: C.textLight, marginBottom: 8 }}>
            A graphical display of a correlation matrix, confidence interval. The details
            are paid to the determination and presentation of the correlation matrix.
          </div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Usage</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, background: C.gutterBg, padding: 8, borderRadius: 3, marginBottom: 8 }}>
            corrplot(corr, method = "circle", type = "full", ...)
          </div>
        </div>
      )}

      {activeTab === "Viewer" && (
        <div style={{ padding: 16, color: C.textMuted, fontSize: 12 }}>
          Viewer pane. No viewer content available.
        </div>
      )}
    </div>
  );
}
