import { describe, expect, it } from 'vitest'
import { lineDiff } from './lineDiff'

describe('lineDiff', () => {
  it('produit des ajouts et suppressions', () => {
    const out = lineDiff('a\nb\nc', 'a\nb\nx\nc')
    expect(out.some((l) => l.type === 'add' && l.text === 'x')).toBe(true)
  })
})
