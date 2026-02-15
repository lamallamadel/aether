export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1)
  return tf
}
