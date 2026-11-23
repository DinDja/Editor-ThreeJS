const LATEX_CONTROL_SEQUENCES = [
  { control: /\t(?=(?:imes|ext|heta|o|ag|herefore)\b)/g, prefix: "\\t" },
  { control: /\f(?=(?:rac|orall)\b)/g, prefix: "\\f" },
  { control: /\u0008(?=(?:eta|egin|ar)\b)/g, prefix: "\\b" },
  { control: /\r(?=(?:ho|ight|ightarrow)\b)/g, prefix: "\\r" },
];

/**
 * AI responses sometimes contain LaTeX inside JSON. Sequences such as
 * `\times` and `\frac` can be decoded by JSON as a tab/form-feed plus text.
 * Restore only the well-known LaTeX prefixes so ordinary whitespace remains
 * untouched.
 */
export function normalizeAiText(value: string): string {
  let normalized = value.replace(/\u0000/g, "");

  for (const { control, prefix } of LATEX_CONTROL_SEQUENCES) {
    normalized = normalized.replace(control, prefix);
  }

  // `\neq`, `\nabla` and similar commands may decode their initial `\n` as
  // an actual newline. Repair those only while inside a math delimiter.
  normalized = normalized.replace(
    /(\${1,2}(?:[^$]|\\.)*)\n(?=(?:eq|u|abla|ot|otag|pm)\b)/g,
    "$1\\n",
  );

  // Support the delimiters commonly produced by ChatGPT-style models.
  normalized = normalized
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula: string) => `$${formula}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) => `$$${formula}$$`);

  return normalized;
}
