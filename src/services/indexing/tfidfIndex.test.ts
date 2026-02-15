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

  it('classe les résultats par pertinence (TF-IDF score)', () => {
    const index = buildTfIdfIndex([
      { fileId: 'a.ts', content: 'un document sur le ranking' },
      { fileId: 'b.ts', content: 'un document sur le ranking avec plus de mots sur le ranking' },
      { fileId: 'c.ts', content: 'ranking est le sujet principal de ce document, ranking ranking' },
    ])
    const results = index.search('ranking', 3)
    expect(results.map((r) => r.doc.fileId)).toEqual(['c.ts', 'b.ts', 'a.ts'])
  })

  it('gère les requêtes à plusieurs termes', () => {
    const index = buildTfIdfIndex([
      { fileId: 'a.ts', content: 'un premier document sur le search' },
      { fileId: 'b.ts', content: 'un second document sur autre chose' },
      { fileId: 'c.ts', content: 'un troisième document qui parle de multiple search' },
    ])
    const results = index.search('multiple search', 3)
    expect(results[0]?.doc.fileId).toBe('c.ts')
    expect(results[1]?.doc.fileId).toBe('a.ts')
  })

  it('retourne un tableau vide si aucun résultat', () => {
    const index = buildTfIdfIndex([
      { fileId: 'a.ts', content: 'un premier document sur le search' },
      { fileId: 'b.ts', content: 'un second document sur autre chose' },
    ])
    const results = index.search('nonexistent', 3)
    expect(results).toEqual([])
  })

  it('respecte le paramètre `topK` pour limiter le nombre de résultats', () => {
    const index = buildTfIdfIndex([
      { fileId: 'a.ts', content: 'limit' },
      { fileId: 'b.ts', content: 'limit' },
      { fileId: 'c.ts', content: 'limit' },
    ])
    const results = index.search('limit', 2)
    expect(results.length).toBe(2)
  })

  it('retrouve un terme dans un chunk spécifique', () => {
    const content = Array.from({ length: 100 }, (_, i) => `ligne ${i + 1}`).join('\n') + '\nterme-specifique'
    const index = buildTfIdfIndex([{ fileId: 'a.ts', content }], 50)
    const results = index.search('terme-specifique')
    expect(results.length).toBe(1)
    expect(results[0].doc.fileId).toBe('a.ts')
    expect(results[0].doc.startLine).toBe(101)
    expect(results[0].doc.endLine).toBe(101)
  })
})
