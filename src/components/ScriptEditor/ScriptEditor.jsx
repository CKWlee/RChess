import React, { useRef, useCallback, useState, useMemo } from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';
import { highlightR } from '../../utils/syntaxHighlighter.jsx';

const C = theme;

const CURRENT_LINE_BG = '#FFFBDD';
const RIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginRight: 4, flexShrink: 0 }}>
    <circle cx="6" cy="6" r="5" fill="none" stroke="#2780E3" strokeWidth="1.5"/>
    <text x="6" y="9" textAnchor="middle" fontSize="8" fill="#2780E3" fontWeight="bold">R</text>
  </svg>
);
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

export default function ScriptEditor({
  tabs, activeTabId, onTabSelect, onTabClose, onTabAdd, onTabContentChange,
  onRunScript, onContextMenu, maximized, onMaximize, onMinimize,
  onInsertPipe, editorWrap, onToggleWrap, highlightLine, onToggleHighlight,
}) {
  const styles = COMPUTED_STYLES;
  const textareaRef = useRef(null);
  const displayRef = useRef(null);
  const gutterRef = useRef(null);
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(1);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const content = activeTab?.content || '';
  const lines = content.split('\n');

  const highlightedLines = useMemo(() => highlightR(content), [content]);
  const diagnostics = useMemo(() => {
    const map = new Map();
    lines.forEach((line, i) => {
      if (line.includes('TODO') || line.includes('FIXME')) map.set(i, '#F39C12');
      else if (line.length > 110) map.set(i, '#4A90E2');
    });
    return map;
  }, [lines]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollLeft } = e.target;
    if (displayRef.current) {
      displayRef.current.scrollTop = scrollTop;
      displayRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  }, []);

  const handleChange = useCallback((e) => {
    onTabContentChange(activeTabId, e.target.value);
  }, [activeTabId, onTabContentChange]);

  const updateCursorLine = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const before = textareaRef.current.value.substring(0, pos);
    const lastNl = before.lastIndexOf('\n');
    setCursorLine(before.split('\n').length - 1);
    setCursorCol(pos - lastNl);
  }, []);

  return (
    <div style={{ ...styles.pane, flex: 1 }} onContextMenu={onContextMenu}>

      <div style={styles.paneTabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              ...styles.paneTab,
              ...(tab.id === activeTabId ? styles.paneTabActive : {}),
              paddingRight: 4,
            }}
            onClick={() => onTabSelect(tab.id)}
          >
            <RIcon />
            <span style={{ marginRight: 2 }}>
              {tab.modified && <span style={{ color: '#E07A5F', fontSize: 8, marginRight: 4 }}>{'\u25CF'}</span>}
              {tab.name}
            </span>
            <button
              style={styles.tabCloseBtn}
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {'\u00D7'}
            </button>
          </div>
        ))}
        <div
          style={styles.tabAddBtn}
          onClick={onTabAdd}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = C.tabInactive)}
          title="New Script"
        >
          +
        </div>
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

      <div style={styles.editorToolbar}>
        <button style={styles.editorBtn} onClick={(e) => { e.stopPropagation(); onRunScript(); }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polygon points="1,0 10,5 1,10" fill="#5fa85f"/>
          </svg>
          <span style={{ marginLeft: 4 }}>Run</span>
        </button>
        <button style={styles.editorBtn}><span>Source</span></button>
        <button style={styles.editorBtn} onClick={(e) => { e.stopPropagation(); onInsertPipe?.(); }} title="Insert %>%">
          <span>%&gt;%</span>
        </button>
        <button style={styles.editorBtn} onClick={(e) => { e.stopPropagation(); onToggleWrap?.(); }}>
          <span>{editorWrap ? 'No Wrap' : 'Soft Wrap'}</span>
        </button>
        <button style={styles.editorBtn} onClick={(e) => { e.stopPropagation(); onToggleHighlight?.(); }}>
          <span>{highlightLine ? 'Hide Line' : 'Show Line'}</span>
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: C.textMuted, marginRight: 8 }}>
          Ln {cursorLine + 1}, Col {cursorCol}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: C.panelBg }}>

        <div ref={gutterRef} style={styles.editorGutter}>
          {lines.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.lineNumber,
                ...(highlightLine && i === cursorLine ? { background: CURRENT_LINE_BG, color: C.textLight } : undefined),
                position: 'relative',
              }}
            >
              {i + 1}
              {diagnostics.has(i) && (
                <span style={{ position: 'absolute', right: 4, top: 8, width: 5, height: 5, borderRadius: 99, background: diagnostics.get(i) }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          <div ref={displayRef} style={styles.editorDisplay}>
            {highlightedLines.map((line, i) => (
              <div
                key={i}
                style={{
                  ...styles.editorDisplayLine,
                  whiteSpace: editorWrap ? 'pre-wrap' : 'pre',
                  ...(highlightLine && i === cursorLine ? { background: CURRENT_LINE_BG } : undefined),
                }}
              >
                {line.length > 0 ? line : '\u00A0'}
              </div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onScroll={handleScroll}
            onClick={updateCursorLine}
            onKeyUp={updateCursorLine}
            style={{ ...styles.editorTextarea, whiteSpace: editorWrap ? 'pre-wrap' : 'pre' }}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
