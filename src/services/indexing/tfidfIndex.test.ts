import { describe, expect, it } from 'vitest'
import { buildTfIdfIndex } from './tfidfIndex'

describe('buildTfIdfIndex', () => {
  it('retrouve un chunk pertinent', () => {
    const index = buildTfIdfIndex([
      { fileId: 'a.ts', content: 'function add(a, b) { return a + b }' },
      { fileId: 'b.ts', content: 'function multiply(a, b) { return a * b }' },
    ])
    const results = index.search('multiply', 3)
    expect(results[0]?.doc.fileId).toBe('b.ts')
  })
})
