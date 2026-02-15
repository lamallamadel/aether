import type { JsonRpcErrorObject } from './types'

export const JSONRPC_ERROR = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

export function makeError(code: number, message: string, data?: unknown): JsonRpcErrorObject {
  return data === undefined ? { code, message } : { code, message, data }
}
