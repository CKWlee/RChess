import React from 'react';
import { theme } from '../../styles/theme.js';
import { COMPUTED_STYLES } from '../../styles/appStyles.js';

const C = theme;

const DATA_POINTS = [
  [65,62],[80,90],[95,72],[75,110],[120,120],[140,145],[90,80],[110,105],
  [130,130],[155,155],[170,162],[60,55],[100,88],[85,70],[145,140],
  [115,115],[135,135],[160,158],[70,65],[105,95],[125,125],[150,148],
  [180,170],[55,48],[175,165],[88,78],[142,138],[112,108],[68,58],[98,85],
];

export default function BossPlot() {
  const styles = COMPUTED_STYLES;
  return (
    <div style={styles.bossPlot}>
      <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        MPG vs Weight
      </div>
      <svg viewBox="0 0 300 220" style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>

        <line x1="40" y1="190" x2="290" y2="190" stroke={C.border} strokeWidth="1" />
        <line x1="40" y1="10" x2="40" y2="190" stroke={C.border} strokeWidth="1" />

        {[50, 90, 130, 170].map((y) => <line key={y} x1="40" y1={y} x2="290" y2={y} stroke="#EEEEEE" strokeWidth="0.5" />)}

        <text x="165" y="210" textAnchor="middle" fontSize="10" fill={C.text}>Weight (1000 lbs)</text>
        <text x="12" y="100" textAnchor="middle" fontSize="10" fill={C.text} transform="rotate(-90 12 100)">MPG</text>

        {[2, 3, 4, 5].map((v, i) => <text key={v} x={40 + i * 83} y="202" textAnchor="middle" fontSize="9" fill={C.textMuted}>{v}</text>)}
        {[10, 15, 20, 25, 30].map((v, i) => <text key={v} x="34" y={190 - i * 36} textAnchor="end" fontSize="9" fill={C.textMuted}>{v}</text>)}

        <line x1="50" y1="45" x2="280" y2="172" stroke="#4682B4" strokeWidth="2" opacity="0.8" />

        <polygon points="50,35 280,160 280,184 50,55" fill="#4682B4" opacity="0.12" />

        {DATA_POINTS.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#333333" opacity="0.6" />
        ))}
      </svg>
    </div>
  );
}
