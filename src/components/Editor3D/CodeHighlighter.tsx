'use client';

import { useMemo } from 'react';

type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'type'
  | 'fn'
  | 'jsxTag'
  | 'jsxAttr'
  | 'punctuation'
  | 'plain';

interface Token {
  text: string;
  type: TokenType;
}

type Lang = 'tsx' | 'ts' | 'js' | 'json' | 'html' | 'css' | 'prisma';

const PALETTE: Record<TokenType, string> = {
  keyword: '#c792ea',
  string: '#c3e88d',
  number: '#f78c6c',
  comment: '#546e7a',
  type: '#ffcb6b',
  fn: '#82aaff',
  jsxTag: '#f07178',
  jsxAttr: '#ffcb6b',
  punctuation: '#89ddff',
  plain: '#abb2bf',
};

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'class', 'extends',
  'implements', 'import', 'export', 'default', 'from', 'as', 'type', 'interface',
  'enum', 'namespace', 'module', 'declare', 'abstract', 'static', 'private',
  'protected', 'public', 'readonly', 'get', 'set', 'try', 'catch', 'finally',
  'throw', 'async', 'await', 'yield', 'of', 'in', 'instanceof', 'typeof',
  'void', 'never', 'unknown', 'any', 'boolean', 'string', 'number', 'symbol',
  'true', 'false', 'null', 'undefined', 'keyof', 'infer', 'is', 'asserts',
  'using', 'satisfies',
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined', 'any', 'unknown',
  'never', 'symbol', 'bigint', 'object', 'Date', 'RegExp', 'Map', 'Set',
  'Promise', 'Array', 'Record', 'Partial', 'Required', 'Readonly', 'Pick',
  'Omit', 'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters',
  'ConstructorParameters', 'InstanceType', 'Awaited', 'React', 'JSX',
  'Element', 'ReactNode', 'FC', 'Ref', 'MutableRefObject', 'Dispatch',
  'SetStateAction', 'ChangeEvent', 'MouseEvent', 'KeyboardEvent',
  'HTMLDivElement', 'HTMLInputElement', 'HTMLElement', 'NodeJS',
]);

function isWordChar(ch: string): boolean {
  return /[\w$]/.test(ch);
}

function isDigit(ch: string): boolean {
  return /[0-9]/.test(ch);
}

function isHexDigit(ch: string): boolean {
  return /[0-9a-fA-F]/.test(ch);
}

function tokenize(source: string, lang: Lang): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    if (source[i] === '\n' || source[i] === '\r') {
      const start = i;
      while (i < len && (source[i] === '\n' || source[i] === '\r')) i++;
      tokens.push({ text: source.slice(start, i), type: 'plain' });
      continue;
    }

    if (source[i] === ' ' || source[i] === '\t') {
      const start = i;
      while (i < len && (source[i] === ' ' || source[i] === '\t')) i++;
      tokens.push({ text: source.slice(start, i), type: 'plain' });
      continue;
    }

    // Line comment
    if (source[i] === '/' && source[i + 1] === '/') {
      const start = i;
      while (i < len && source[i] !== '\n') i++;
      tokens.push({ text: source.slice(start, i), type: 'comment' });
      continue;
    }

    // Block comment
    if (source[i] === '/' && source[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      if (i < len - 1) i += 2;
      tokens.push({ text: source.slice(start, i), type: 'comment' });
      continue;
    }

    // HTML comment
    if (lang === 'html' && source[i] === '<' && source.slice(i, i + 4) === '<!--') {
      const start = i;
      i += 4;
      while (i < len - 2 && !(source[i] === '-' && source[i + 1] === '-' && source[i + 2] === '>')) i++;
      if (i < len - 2) i += 3;
      tokens.push({ text: source.slice(start, i), type: 'comment' });
      continue;
    }

    // CSS comment
    if (lang === 'css' && source[i] === '/' && source[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      if (i < len - 1) i += 2;
      tokens.push({ text: source.slice(start, i), type: 'comment' });
      continue;
    }

    // Template literal with expressions
    if ((lang === 'tsx' || lang === 'ts' || lang === 'js') && source[i] === '`') {
      let start = i;
      i++;
      while (i < len && source[i] !== '`' && source[i] !== '$') {
        if (source[i] === '\\') i += 2;
        else i++;
      }
      if (i < len && source[i] === '$' && source[i + 1] === '{') {
        tokens.push({ text: source.slice(start, i), type: 'string' });
        tokens.push({ text: '${', type: 'punctuation' });
        i += 2;
        let depth = 1;
        start = i;
        while (i < len && depth > 0) {
          if (source[i] === '{') depth++;
          else if (source[i] === '}') depth--;
          i++;
        }
        const inner = source.slice(start, i - 1);
        // Recursively tokenize the inner expression
        tokens.push(...tokenize(inner, lang));
        tokens.push({ text: '}', type: 'punctuation' });
        start = i;
      }
      while (i < len && source[i] !== '`') {
        if (source[i] === '\\') i += 2;
        else i++;
      }
      if (i < len) i++;
      if (i > start) tokens.push({ text: source.slice(start, i), type: 'string' });
      continue;
    }

    // Single-quoted string
    if (source[i] === "'") {
      const start = i;
      i++;
      while (i < len && source[i] !== "'") {
        if (source[i] === '\\') i += 2;
        else i++;
      }
      if (i < len) i++;
      tokens.push({ text: source.slice(start, i), type: 'string' });
      continue;
    }

    // Double-quoted string (for all languages including HTML attributes)
    if (source[i] === '"') {
      const start = i;
      i++;
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\') i += 2;
        else i++;
      }
      if (i < len) i++;
      tokens.push({ text: source.slice(start, i), type: 'string' });
      continue;
    }

    // HTML/JSX tag
    if ((lang === 'tsx' || lang === 'html') && source[i] === '<') {
      if (
        isWordChar(source[i + 1]) ||
        source[i + 1] === '/' ||
        source[i + 1] === '!'
      ) {
        const start = i;
        i++;
        if (source[i] === '/') i++;
        while (i < len && isWordChar(source[i])) i++;

        // Skip attributes
        while (i < len && source[i] !== '>' && source[i] !== '/') {
          if (source[i] === '"') {
            i++;
            while (i < len && source[i] !== '"') {
              if (source[i] === '\\') i += 2;
              else i++;
            }
            if (i < len) i++;
          } else if (source[i] === "'") {
            i++;
            while (i < len && source[i] !== "'") {
              if (source[i] === '\\') i += 2;
              else i++;
            }
            if (i < len) i++;
          } else if (source[i] === '{') {
            // JSX expression
            const expStart = i;
            i++;
            let depth = 1;
            while (i < len && depth > 0) {
              if (source[i] === '{') depth++;
              else if (source[i] === '}') depth--;
              i++;
            }
            // Split: tag part before {, then expression, then rest
            if (expStart > start) {
              tokens.push({ text: source.slice(start, expStart), type: 'jsxTag' });
              tokens.push(...tokenize(source.slice(expStart, i), lang));
              // Re-scan from i for remaining tag
              const remStart = i;
              while (i < len && source[i] !== '>' && source[i] !== '/') i++;
              if (i < len && source[i] === '/') i++;
              if (i < len && source[i] === '>') i++;
              if (i > remStart) tokens.push({ text: source.slice(remStart, i), type: 'jsxTag' });
              continue; // outer loop
            }
          } else {
            i++;
          }
        }
        if (i < len && source[i] === '/') i++;
        if (i < len && source[i] === '>') i++;
        tokens.push({ text: source.slice(start, i), type: 'jsxTag' });
        continue;
      }
    }

    // HTML closing tag
    if (lang === 'html' && source[i] === '<' && source[i + 1] === '/') {
      const start = i;
      while (i < len && source[i] !== '>') i++;
      if (i < len) i++;
      tokens.push({ text: source.slice(start, i), type: 'jsxTag' });
      continue;
    }

    // JSX closing tag (handled above, but if standalone </Foo>)
    if ((lang === 'tsx') && source[i] === '<' && source[i + 1] === '/') {
      const start = i;
      while (i < len && source[i] !== '>') i++;
      if (i < len) i++;
      tokens.push({ text: source.slice(start, i), type: 'jsxTag' });
      continue;
    }

    // Number
    if (
      isDigit(source[i]) ||
      (source[i] === '.' && isDigit(source[i + 1])) ||
      (source[i] === '-' && isDigit(source[i + 1]) && tokens.length > 0 && tokens[tokens.length - 1].type === 'punctuation')
    ) {
      const start = i;
      if (source[i] === '-') i++;
      if (source[i] === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        i += 2;
        while (i < len && isHexDigit(source[i])) i++;
      } else {
        while (i < len && (isDigit(source[i]) || source[i] === '.')) i++;
      }
      if (i > start) {
        tokens.push({ text: source.slice(start, i), type: 'number' });
        continue;
      }
    }

    // Hex color in CSS/HTML
    if (source[i] === '#' && (lang === 'css' || lang === 'html')) {
      const start = i;
      i++;
      while (i < len && isHexDigit(source[i])) i++;
      if (i - start === 4 || i - start === 7 || i - start === 9) {
        tokens.push({ text: source.slice(start, i), type: 'number' });
        continue;
      }
      i = start;
    }

    // CSS property
    if (lang === 'css') {
      if (source[i] === '.' || source[i] === '#' || source[i] === '@') {
        const start = i;
        i++;
        while (i < len && (isWordChar(source[i]) || source[i] === '-')) i++;
        tokens.push({ text: source.slice(start, i), type: 'jsxTag' });
        continue;
      }
      if (source[i] === ':') {
        tokens.push({ text: ':', type: 'punctuation' });
        i++;
        continue;
      }
      if (source[i] === ';') {
        tokens.push({ text: ';', type: 'punctuation' });
        i++;
        continue;
      }
    }

    // Word (keyword, type, function, identifier)
    if (isWordChar(source[i])) {
      const start = i;
      while (i < len && isWordChar(source[i])) i++;
      const word = source.slice(start, i);

      if (lang !== 'css' && lang !== 'html' && lang !== 'json') {
        if (KEYWORDS.has(word)) {
          tokens.push({ text: word, type: 'keyword' });
          continue;
        }
        if (TYPES.has(word)) {
          tokens.push({ text: word, type: 'type' });
          continue;
        }
        // Function call detection: word followed by (
        if (source[i] === '(' && i - start > 0) {
          tokens.push({ text: word, type: 'fn' });
          continue;
        }
        tokens.push({ text: word, type: 'plain' });
        continue;
      }

      // JSON: keys before : are strings (but we already handle quoted keys)
      if (lang === 'json') {
        if (word === 'true' || word === 'false' || word === 'null') {
          tokens.push({ text: word, type: 'keyword' });
          continue;
        }
        tokens.push({ text: word, type: 'plain' });
        continue;
      }

      // HTML attribute-like word
      if (lang === 'html' && source[i - 1] !== undefined && source.slice(start - 1, start) !== '<' && source.slice(Math.max(0, start - 1), start) !== ' ') {
        tokens.push({ text: word, type: 'plain' });
        continue;
      }

      tokens.push({ text: word, type: 'plain' });
      continue;
    }

    // Punctuation / operators
    const punctChars = '{}[]()<>;,.:=+-*/%&|^!~?';
    if (punctChars.includes(source[i])) {
      const start = i;
      i++;
      // Multi-char operators
      if (
        (source[start] === '=' && source[i] === '>') ||
        (source[start] === '=' && source[i] === '=') ||
        (source[start] === '!' && source[i] === '=') ||
        (source[start] === '<' && source[i] === '=') ||
        (source[start] === '>' && source[i] === '=') ||
        (source[start] === '+' && source[i] === '=') ||
        (source[start] === '-' && source[i] === '=') ||
        (source[start] === '+' && source[i] === '+') ||
        (source[start] === '-' && source[i] === '-') ||
        (source[start] === '&' && source[i] === '&') ||
        (source[start] === '|' && source[i] === '|') ||
        (source[start] === '=' && source[i] === '>') ||
        (source[start] === '.' && source[i] === '.')
      ) {
        i++;
      }
      tokens.push({ text: source.slice(start, i), type: 'punctuation' });
      continue;
    }

    // Fallback
    tokens.push({ text: source[i], type: 'plain' });
    i++;
  }

  return tokens;
}

function mergeAdjacent(tokens: Token[]): Token[] {
  const merged: Token[] = [];
  for (const t of tokens) {
    if (t.text.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && last.type === t.type) {
      last.text += t.text;
    } else {
      merged.push({ ...t });
    }
  }
  return merged;
}

export default function CodeHighlighter({ code, language }: { code: string; language: Lang }) {
  const tokens = useMemo(() => mergeAdjacent(tokenize(code, language)), [code, language]);

  return (
    <code>
      {tokens.map((token, i) => (
        <span key={i} style={{ color: PALETTE[token.type] }}>
          {token.text}
        </span>
      ))}
    </code>
  );
}
