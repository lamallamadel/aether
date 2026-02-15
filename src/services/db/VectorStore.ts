import { db } from './AetherDB'
import type { DBVector } from './types'

const cosineSimilarity = (vecA: Float32Array, vecB: Float32Array): number => {
    if (vecA.length !== vecB.length) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface EmbeddingProvider {
    embed(text: string): Promise<Float32Array>
}

// Placeholder for the actual embedding model
import { pipeline } from '@xenova/transformers'

export const transformersEmbeddingProvider: EmbeddingProvider = {
    embed: async (text: string) => {
        const extractor = await PipelineSingleton.getInstance()
        const output = await extractor(text, { pooling: 'mean', normalize: true })
        return output.data as Float32Array
    }
}

class PipelineSingleton {
    static task = 'feature-extraction'
    static model = 'Xenova/all-MiniLM-L6-v2'
    static instance: any = null

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task as any, this.model, { progress_callback })
        }
        return this.instance
    }
}

export class VectorStore {
    private provider: EmbeddingProvider

    constructor(provider: EmbeddingProvider = transformersEmbeddingProvider) {
        this.provider = provider
    }

    async persistVectors(fileId: string, chunks: { content: string; startLine: number; endLine: number }[]) {
        const vectors: DBVector[] = []
        for (const chunk of chunks) {
            const embedding = await this.provider.embed(chunk.content)
            vectors.push({
                id: `${fileId}:${chunk.startLine}-${chunk.endLine}`,
                fileId,
                content: chunk.content,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                embedding,
                hash: this.simpleHash(chunk.content)
            })
        }
        await db.upsertVectors(vectors)
    }

    async search(query: string, limit = 5): Promise<(DBVector & { score: number })[]> {
        const queryVector = await this.provider.embed(query)
        const allVectors = await db.getAllVectors()

        const scored = allVectors
            .filter(v => v.embedding)
            .map(v => ({
                ...v,
                score: cosineSimilarity(queryVector, v.embedding!)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)

        return scored
    }

    private simpleHash(str: string): string {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = (hash << 5) - hash + char
            hash = hash & hash // Convert to 32bit integer
        }
        return hash.toString(36)
    }
}

export const vectorStore = new VectorStore()
