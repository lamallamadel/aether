import { describe, expect, it } from 'vitest'
import { PieceTableBuffer } from './pieceTableBuffer'

describe('PieceTableBuffer', () => {
  it('insert ajoute du texte', () => {
    const b = PieceTableBuffer.fromText('abc')
    const b2 = b.insert(1, 'ZZ') as PieceTableBuffer
    expect(b.getText()).toBe('abc')
    expect(b2.getText()).toBe('aZZbc')
  })

  it('delete supprime un intervalle', () => {
    const b = PieceTableBuffer.fromText('hello world')
    const b2 = b.delete(5, 11) as PieceTableBuffer
    expect(b2.getText()).toBe('hello')
  })

  it('insert puis delete reste cohérent', () => {
    const b = PieceTableBuffer.fromText('012345')
    const b2 = b.insert(3, 'AAA').delete(2, 6) as PieceTableBuffer
    expect(b2.getText()).toBe('01' + '345')
  })
})
