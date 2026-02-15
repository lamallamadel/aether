
export type TokenType = 'keyword' | 'string' | 'comment' | 'component' | 'number' | 'operator' | 'text'

export interface Token {
    type: TokenType
    content: string
}

const KEYWORDS = new Set([
    'import', 'from', 'export', 'default', 'function', 'const', 'let', 'var',
    'return', 'if', 'else', 'useEffect', 'useState', 'useMemo', 'useCallback',
    'interface', 'type', 'class', 'extends', 'implements', 'new', 'this',
    'async', 'await', 'try', 'catch', 'finally', 'throw', 'switch', 'case'
])

export const highlightCode = (code: string): Token[] => {
    if (!code) return []
    const tokens: Token[] = []
    let remaining = code

    while (remaining.length > 0) {
        // Strings (single and double quotes)
        if (remaining.startsWith('"') || remaining.startsWith("'") || remaining.startsWith('`')) {
            const quote = remaining[0]
            const endQuote = remaining.indexOf(quote, 1)

            // Handle unclosed string by taking the rest of the line or file
            const length = endQuote === -1 ? remaining.length : endQuote + 1
            tokens.push({ type: 'string', content: remaining.slice(0, length) })
            remaining = remaining.slice(length)
            continue
        }

        // Comments (single line)
        if (remaining.startsWith('//')) {
            const endLine = remaining.indexOf('\n')
            const length = endLine === -1 ? remaining.length : endLine
            tokens.push({ type: 'comment', content: remaining.slice(0, length) })
            remaining = remaining.slice(length)
            continue
        }

        // Numbers
        const numberMatch = remaining.match(/^\d+(\.\d+)?/)
        if (numberMatch) {
            tokens.push({ type: 'number', content: numberMatch[0] })
            remaining = remaining.slice(numberMatch[0].length)
            continue
        }

        // Keywords or Identifiers
        const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
        if (wordMatch) {
            const word = wordMatch[0]
            if (KEYWORDS.has(word)) {
                tokens.push({ type: 'keyword', content: word })
            } else if (/^[A-Z]/.test(word)) {
                // Assume Capitalized words are components or classes
                tokens.push({ type: 'component', content: word })
            } else {
                tokens.push({ type: 'text', content: word })
            }
            remaining = remaining.slice(word.length)
            continue
        }

        // Operators and Punctuation
        const operatorMatch = remaining.match(/^[=+\-*/&|!<>?:;,.(){}[\]]+/)
        if (operatorMatch) {
            tokens.push({ type: 'operator', content: operatorMatch[0] })
            remaining = remaining.slice(operatorMatch[0].length)
            continue
        }

        // Whitespace and fallback (consume 1 char)
        const whitespaceMatch = remaining.match(/^\s+/)
        if (whitespaceMatch) {
            tokens.push({ type: 'text', content: whitespaceMatch[0] })
            remaining = remaining.slice(whitespaceMatch[0].length)
        } else {
            // Fallback for unknown chars
            tokens.push({ type: 'text', content: remaining[0] })
            remaining = remaining.slice(1)
        }
    }

    return tokens
}

export const getTokenColor = (type: TokenType): string => {
    switch (type) {
        case 'keyword': return 'text-purple-400'
        case 'string': return 'text-yellow-300'
        case 'comment': return 'text-gray-500 italic'
        case 'component': return 'text-cyan-300'
        case 'number': return 'text-orange-300'
        case 'operator': return 'text-pink-400'
        default: return 'text-gray-100'
    }
}
