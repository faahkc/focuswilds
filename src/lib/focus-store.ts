export type Cursor = { id: string; snapshot: unknown }
export type ListOptions = { field: string; limit: number; start?: string; end?: string; cursor?: Cursor | null }
export type StoreRow = { id: string; data: unknown }
export type Transaction = {
  get(path: string): Promise<unknown | null>
  set(path: string, data: object): void
}
export type FocusStore = {
  get(path: string): Promise<unknown | null>
  list(path: string, options: ListOptions): Promise<{ rows: StoreRow[]; cursor: Cursor | null }>
  transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T>
}
