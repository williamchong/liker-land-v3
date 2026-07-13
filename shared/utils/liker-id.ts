export function normalizeLikerId(likerId: string): string {
  return likerId.startsWith('@') ? likerId.slice(1) : likerId
}

// Inverse of normalizeLikerId. The `@` prefix is the wire format of the `from`
// query param, which affiliate consumers gate on before treating it as a referrer.
export function formatLikerIdHandle(likerId: string): string {
  return `@${normalizeLikerId(likerId)}`
}
