import type { WorkerMessage, WorkerEventType, WorkerResponse } from './worker.types'

class WorkerBridge {
    private syntaxWorker: Worker | null = null
    private indexerWorker: Worker | null = null
    private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>()

    constructor() {
        // Lazy init is handled in postRequest
    }

    private initSyntaxWorker() {
        if (this.syntaxWorker) return
        this.syntaxWorker = new Worker(new URL('../../workers/syntax.worker.ts', import.meta.url), {
            type: 'module',
        })
        this.setupWorkerListener(this.syntaxWorker)
    }

    private initIndexerWorker() {
        if (this.indexerWorker) return
        console.log('WorkerBridge: Initializing Indexer Worker...')
        try {
            this.indexerWorker = new Worker(new URL('../../workers/indexer.worker.ts', import.meta.url), {
                type: 'module',
            })
            this.setupWorkerListener(this.indexerWorker)
            console.log('WorkerBridge: Indexer Worker Created')
        } catch (e) {
            console.error('WorkerBridge: Failed to create Indexer Worker', e)
        }
    }

    private setupWorkerListener(worker: Worker) {
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { id, payload, error } = event.data
            const request = this.pendingRequests.get(id)

            if (request) {
                if (error) {
                    request.reject(error)
                } else {
                    request.resolve(payload)
                }
                this.pendingRequests.delete(id)
            }
        }

        worker.onerror = (err) => {
            console.error('Worker Error:', err)
        }
    }

    public postRequest<T = any>(type: WorkerEventType, payload: any): Promise<T> {
        const id = crypto.randomUUID()
        const message: WorkerMessage = { id, type, payload }

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject })

            let targetWorker: Worker | null = null

            switch (type) {
                case 'PARSE':
                    this.initSyntaxWorker()
                    targetWorker = this.syntaxWorker
                    break
                case 'INDEX_BUILD':
                case 'INDEX_SEARCH':
                    this.initIndexerWorker()
                    targetWorker = this.indexerWorker
                    break
                default:
                    reject(new Error(`Unknown worker event type: ${type}`))
                    return
            }

            targetWorker?.postMessage(message)
        })
    }

    public terminate() {
        this.syntaxWorker?.terminate()
        this.indexerWorker?.terminate()
        this.syntaxWorker = null
        this.indexerWorker = null
        this.pendingRequests.clear()
    }
}

export const workerBridge = new WorkerBridge()
