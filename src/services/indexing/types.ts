export type IndexedDocument = {
  id: string
  fileId: string
  startLine: number
  endLine: number
  text: string
}

export type SearchResult = {
  doc: IndexedDocument
  score: number
}
