import React from 'react';
import { theme, FONT_UI } from '../../styles/theme.js';

const C = theme;
const OVERLAY_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2000,
};

const MENU_STYLE = {
  position: 'fixed',
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  padding: '4px 0',
  minWidth: 200,
  zIndex: 2001,
  fontSize: 12,
  fontFamily: FONT_UI,
};

const ITEM_STYLE = {
  padding: '5px 24px 5px 16px',
  cursor: 'pointer',
  color: C.text,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const SEP_STYLE = {
  height: 1,
  background: C.borderLight,
  margin: '4px 0',
};

const SHORTCUT_STYLE = {
  color: C.textMuted,
  fontSize: 11,
  marginLeft: 24,
};

export const EDITOR_CONTEXT_ITEMS = [
  { label: 'Cut', shortcut: 'Ctrl+X' },
  { label: 'Copy', shortcut: 'Ctrl+C' },
  { label: 'Paste', shortcut: 'Ctrl+V' },
  { separator: true },
  { label: 'Select All', shortcut: 'Ctrl+A' },
  { separator: true },
  { label: 'Run Selected Line(s)', shortcut: 'Ctrl+Enter' },
  { label: 'Run From Here to End' },
  { label: 'Source Current File' },
  { separator: true },
  { label: 'Insert Section...', shortcut: 'Ctrl+Shift+R' },
  { label: 'Comment/Uncomment', shortcut: 'Ctrl+Shift+C' },
  { label: 'Reindent Lines' },
  { label: 'Reformat Code', shortcut: 'Ctrl+Shift+A' },
];

export const CONSOLE_CONTEXT_ITEMS = [
  { label: 'Copy', shortcut: 'Ctrl+C' },
  { label: 'Paste', shortcut: 'Ctrl+V' },
  { label: 'Paste as Command' },
  { separator: true },
  { label: 'Select All', shortcut: 'Ctrl+A' },
  { label: 'Clear Console', shortcut: 'Ctrl+L' },
  { separator: true },
  { label: 'Copy to Editor' },
];

export default function ContextMenu({ x, y, items, onClose }) {
  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - items.length * 28);

  return (
    <div style={OVERLAY_STYLE} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div style={{ ...MENU_STYLE, left: menuX, top: menuY }} onClick={(e) => e.stopPropagation()}>
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} style={SEP_STYLE} />
          ) : (
            <div
              key={i}
              style={ITEM_STYLE}
              onClick={() => { if (item.action) item.action(); onClose(); }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{item.label}</span>
              {item.shortcut && <span style={SHORTCUT_STYLE}>{item.shortcut}</span>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
