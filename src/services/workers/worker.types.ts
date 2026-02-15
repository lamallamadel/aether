export type WorkerEventType = 'PARSE' | 'DIFF' | 'CHUNK' | 'VECTORIZE' | 'INDEX_BUILD' | 'INDEX_SEARCH'

export interface WorkerMessage<T = any> {
    id: string
    type: WorkerEventType
    payload: T
}

export interface WorkerResponse<T = any> {
    id: string
    payload: T
    error?: string
}
