
import React from 'react';
import { theme } from '../styles/theme.js';

const C = theme;
const HL_STYLES = {
  comment: { color: C.comment, fontStyle: "italic" },
  string: { color: C.string },
  number: { color: C.number },
  keyword: { color: C.keyword, fontWeight: 500 },
  operator: { color: C.operator },
};

export function highlightR(code) {
  const lines = code.split("\n");
  return lines.map((line) => {
    const result = [];
    let remaining = line;
    let key = 0;
    let plainBuf = "";

    const flushPlain = () => {
      if (plainBuf) {
        result.push(<span key={key++}>{plainBuf}</span>);
        plainBuf = "";
      }
    };

    while (remaining.length > 0) {
      const commentMatch = remaining.match(/^(#.*)/);
      if (commentMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.comment}>{commentMatch[1]}</span>);
        remaining = remaining.slice(commentMatch[1].length);
        continue;
      }
      const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (strMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.string}>{strMatch[1]}</span>);
        remaining = remaining.slice(strMatch[1].length);
        continue;
      }
      const numMatch = remaining.match(/^(\b\d+\.?\d*(?:e[+-]?\d+)?\b)/);
      if (numMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.number}>{numMatch[1]}</span>);
        remaining = remaining.slice(numMatch[1].length);
        continue;
      }
      const kwMatch = remaining.match(
        /^(\b(?:library|function|if|else|for|while|return|TRUE|FALSE|NULL|NA|data\.frame|c|set\.seed|rnorm|cor|round|print|cat|nrow|install\.packages|corrplot|names|abs|matrix|head|summary|mean|sd|var|lm|predict|read\.csv|par|plot|ggplot|aes|geom_point|geom_smooth|labs|theme_minimal)\b)/
      );
      if (kwMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.keyword}>{kwMatch[1]}</span>);
        remaining = remaining.slice(kwMatch[1].length);
        continue;
      }
      const assignMatch = remaining.match(/^(<-|->|=)/);
      if (assignMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.operator}>{assignMatch[1]}</span>);
        remaining = remaining.slice(assignMatch[1].length);
        continue;
      }
      const opMatch = remaining.match(/^([+\-*/%^&|!<>=~$@:,;(){}\[\]])/);
      if (opMatch) {
        flushPlain();
        result.push(<span key={key++} style={HL_STYLES.operator}>{opMatch[1]}</span>);
        remaining = remaining.slice(opMatch[1].length);
        continue;
      }
      plainBuf += remaining[0];
      remaining = remaining.slice(1);
    }
    flushPlain();
    return result;
  });
}
