export interface DBSchema {
  version: number
  stores: {
    files: {
      keyPath: 'id'
      indexes: ['parentId', 'type']
    }
    vectors: {
      keyPath: 'id'
      indexes: ['fileId']
    }
  }
}

export interface DBFile {
  id: string
  parentId: string | null
  name: string
  type: 'file' | 'folder'
  content?: string
  language?: string
  lastModified: number
  isOpen?: boolean
}

export interface DBVector {
  id: string
  fileId: string
  content: string
  startLine: number
  endLine: number
  embedding?: Float32Array // The semantic vector
  hash: string
  tags?: string[]
}
