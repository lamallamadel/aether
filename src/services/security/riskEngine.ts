export type RiskLevel = 'trivial' | 'review' | 'high'

export type RiskReport = {
  level: RiskLevel
  reasons: string[]
}

const countMatches = (re: RegExp, s: string) => (s.match(re) ?? []).length

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b)

export const assessProposedChange = (originalContent: string, proposedContent: string): RiskReport => {
  const reasons: string[] = []
  const originalLines = originalContent.split('\n')
  const proposedLines = proposedContent.split('\n')
  const deltaLines = Math.abs(proposedLines.length - originalLines.length)

  const originalLen = originalContent.length
  const proposedLen = proposedContent.length
  const deltaLen = Math.abs(proposedLen - originalLen)

  const introducesNetwork =
    countMatches(/\bfetch\s*\(/g, proposedContent) > countMatches(/\bfetch\s*\(/g, originalContent) ||
    countMatches(/\bXMLHttpRequest\b/g, proposedContent) > countMatches(/\bXMLHttpRequest\b/g, originalContent) ||
    countMatches(/\bWebSocket\b/g, proposedContent) > countMatches(/\bWebSocket\b/g, originalContent)
  if (introducesNetwork) reasons.push('Introduces or increases network calls')

  const introducesSecrets =
    /api[_-]?key|secret|token|authorization/i.test(proposedContent) && !/api[_-]?key|secret|token|authorization/i.test(originalContent)
  if (introducesSecrets) reasons.push('Adds secret-like identifiers')

  const addsEval = /\beval\s*\(/.test(proposedContent) && !/\beval\s*\(/.test(originalContent)
  if (addsEval) reasons.push('Adds eval usage')

  const addsDangerousFs =
    /\bchild_process\b|\bexec\s*\(|\bspawn\s*\(|\bfs\.|from\s+['"]fs/.test(proposedContent) &&
    !(/\bchild_process\b|\bexec\s*\(|\bspawn\s*\(|\bfs\.|from\s+['"]fs/.test(originalContent))
  if (addsDangerousFs) reasons.push('Adds OS/process access patterns')

  const largeChange = deltaLines > 120 || ratio(deltaLen, Math.max(1, originalLen)) > 0.6
  if (largeChange) reasons.push('Large diff footprint')

  const touchesConfig = /(vite\.config\.ts|package\.json|tsconfig)/i.test(proposedContent)
  if (touchesConfig) reasons.push('Touches configuration patterns')

  if (reasons.length === 0) return { level: 'trivial', reasons }

  const highSignals = ['Introduces or increases network calls', 'Adds eval usage', 'Adds OS/process access patterns', 'Adds secret-like identifiers']
  const hasHigh = reasons.some((r) => highSignals.includes(r))
  if (hasHigh) return { level: 'high', reasons }
  return { level: 'review', reasons }
}

