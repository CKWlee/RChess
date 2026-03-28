import React, { Fragment, memo, useCallback } from 'react';
import { theme, FONT_MONO } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';
import { CORR_VALUES, VAR_LABELS, corrToColor } from '../../utils/heatmapEncoder.js';
import { getPieceName, indexToAlgebraic } from '../../engine/chess.js';

const C = theme;
const LEGEND_ITEMS = Array.from({ length: 20 }, (_, i) => {
  const val = 1 - i * 0.1;
  return { key: i, bg: corrToColor(val) };
});
const HeatmapCell = memo(function HeatmapCell({ piece, r, c, isHovered, isLast }) {
  const val = piece ? CORR_VALUES[piece] : 0;
  const styles = COMPUTED_STYLES;
  return (
    <div
      data-r={r}
      data-c={c}
      style={{
        ...styles.heatmapCell,
        background: corrToColor(val),
        outline: isLast ? "2px solid rgba(0,0,0,0.25)" : isHovered ? "1px solid rgba(0,0,0,0.3)" : "none",
        outlineOffset: "-1px",
        position: "relative",
      }}
    >
      <span style={{ fontSize: "min(1.3vw, 11px)", color: Math.abs(val) > 0.6 ? "#FFFFFF" : "#333333", fontFamily: FONT_MONO, fontWeight: 500, userSelect: "none" }}>
        {val !== 0 ? val.toFixed(2) : ""}
      </span>
      {isHovered && (
        <div style={styles.tooltip}>
          <div style={{ fontWeight: 600 }}>{VAR_LABELS[r]} × {VAR_LABELS[c]}</div>
          <div>r = {val.toFixed(2)}</div>
          {piece && <div style={{ color: C.textMuted }}>{getPieceName(piece)}</div>}
          <div style={{ fontSize: 10, color: C.textMuted }}>{indexToAlgebraic(r, c)}</div>
        </div>
      )}
    </div>
  );
});
const HeatmapBoard = memo(function HeatmapBoard({ board, lastMove, hoveredCell, setHoveredCell }) {
  const styles = COMPUTED_STYLES;
  const lastFromAlg = lastMove?.from;
  const lastToAlg = lastMove?.to;
  const handleMouseOver = useCallback((e) => {
    const cell = e.target.closest('[data-r]');
    if (cell) setHoveredCell({ r: +cell.dataset.r, c: +cell.dataset.c });
  }, [setHoveredCell]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, [setHoveredCell]);

  return (
    <div style={styles.heatmapContainer}>
      <div style={{ textAlign: "center", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
        corrplot(correlation_matrix, method = &quot;color&quot;)
      </div>
      <div style={styles.heatmapWrapper}>
        <div style={styles.heatmapGrid} onMouseOver={handleMouseOver} onMouseLeave={handleMouseLeave}>
          <div style={styles.heatmapCorner} />
          {VAR_LABELS.map((v, c) => (
            <div key={c} style={styles.heatmapColLabel}>
              <span style={styles.heatmapColText}>{v}</span>
            </div>
          ))}
          {board.map((row, r) => (
            <Fragment key={r}>
              <div style={styles.heatmapRowLabel}>{VAR_LABELS[r]}</div>
              {row.map((piece, c) => {
                const alg = indexToAlgebraic(r, c);
                const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
                const isLast = lastMove && (lastFromAlg === alg || lastToAlg === alg);
                return (
                  <HeatmapCell
                    key={(r << 3) | c}
                    piece={piece}
                    r={r}
                    c={c}
                    isHovered={isHovered}
                    isLast={isLast}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
        <div style={styles.legendContainer}>
          <div style={styles.legendBar}>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.key} style={{ height: "5%", background: item.bg, width: "100%" }} />
            ))}
          </div>
          <div style={styles.legendLabels}>
            <span>1.0</span>
            <span>0.5</span>
            <span>0</span>
            <span>−0.5</span>
            <span>−1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HeatmapBoard;
