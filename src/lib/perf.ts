// ---------------------------------------------------------------------------
// debounce — delays execution until `delay` ms of silence
// ---------------------------------------------------------------------------

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  return (...args: Parameters<T>): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      fn(...args)
    }, delay)
  }
}

// ---------------------------------------------------------------------------
// throttle — executes at most once per `delay` ms (leading edge)
// ---------------------------------------------------------------------------

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>): void => {
    const now = Date.now()
    if (now - lastCall < delay) return
    lastCall = now
    fn(...args)
  }
}

// ---------------------------------------------------------------------------
// createCache — time-based cache for expensive async operations
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T
  timestamp: number
}

export interface Cache<T> {
  get(): Promise<T>
  invalidate(): void
  isStale(): boolean
}

export function createCache<T>(fetcher: () => Promise<T>, ttlMs: number): Cache<T> {
  let entry: CacheEntry<T> | undefined

  function isStale(): boolean {
    if (entry === undefined) return true
    return Date.now() - entry.timestamp >= ttlMs
  }

  async function get(): Promise<T> {
    if (entry !== undefined && !isStale()) return entry.value

    const value = await fetcher()
    entry = { value, timestamp: Date.now() }
    return value
  }

  function invalidate(): void {
    entry = undefined
  }

  return { get, invalidate, isStale }
}

// ---------------------------------------------------------------------------
// createPaginator — offset-based pagination for lists (commit logs, etc.)
// ---------------------------------------------------------------------------

export interface Paginator<T> {
  items(): T[]
  loadMore(): Promise<void>
  hasMore(): boolean
  reset(): void
}

export function createPaginator<T>(
  fetcher: (offset: number, limit: number) => Promise<T[]>,
  pageSize: number,
): Paginator<T> {
  let allItems: T[] = []
  let canLoadMore = true

  function items(): T[] {
    return allItems
  }

  async function loadMore(): Promise<void> {
    if (!canLoadMore) return

    const page = await fetcher(allItems.length, pageSize)
    allItems = [...allItems, ...page]

    if (page.length < pageSize) {
      canLoadMore = false
    }
  }

  function hasMore(): boolean {
    return canLoadMore
  }

  function reset(): void {
    allItems = []
    canLoadMore = true
  }

  return { items, loadMore, hasMore, reset }
}
