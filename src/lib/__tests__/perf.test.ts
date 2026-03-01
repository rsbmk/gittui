import { test, expect, describe } from "bun:test"
import { debounce, throttle, createCache, createPaginator } from "../perf.ts"

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe("debounce", () => {
  test("only calls function after delay", async () => {
    let calls = 0
    const debounced = debounce(() => calls++, 30)

    debounced()
    expect(calls).toBe(0)

    await sleep(50)
    expect(calls).toBe(1)
  })

  test("cancels previous call on rapid fire", async () => {
    let calls = 0
    const debounced = debounce(() => calls++, 30)

    debounced()
    debounced()
    debounced()

    await sleep(50)
    expect(calls).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------

describe("throttle", () => {
  test("limits execution rate", async () => {
    let calls = 0
    const throttled = throttle(() => calls++, 40)

    // First call goes through immediately (leading edge)
    throttled()
    expect(calls).toBe(1)

    // These should be suppressed — still within the 40ms window
    throttled()
    throttled()
    expect(calls).toBe(1)

    // After the window expires, next call goes through
    await sleep(50)
    throttled()
    expect(calls).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// createCache
// ---------------------------------------------------------------------------

describe("createCache", () => {
  test("returns cached value within TTL", async () => {
    let fetchCount = 0
    const cache = createCache(async () => {
      fetchCount++
      return "data"
    }, 100)

    const first = await cache.get()
    const second = await cache.get()

    expect(first).toBe("data")
    expect(second).toBe("data")
    expect(fetchCount).toBe(1)
  })

  test("refetches after TTL expires", async () => {
    let fetchCount = 0
    const cache = createCache(async () => {
      fetchCount++
      return `data-${fetchCount}`
    }, 30)

    const first = await cache.get()
    expect(first).toBe("data-1")
    expect(cache.isStale()).toBe(false)

    await sleep(50)
    expect(cache.isStale()).toBe(true)

    const second = await cache.get()
    expect(second).toBe("data-2")
    expect(fetchCount).toBe(2)
  })

  test("invalidate forces refetch", async () => {
    let fetchCount = 0
    const cache = createCache(async () => {
      fetchCount++
      return fetchCount
    }, 5_000)

    await cache.get()
    expect(fetchCount).toBe(1)

    cache.invalidate()
    expect(cache.isStale()).toBe(true)

    await cache.get()
    expect(fetchCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// createPaginator
// ---------------------------------------------------------------------------

describe("createPaginator", () => {
  function makeFetcher(total: number) {
    return async (offset: number, limit: number): Promise<number[]> => {
      const end = Math.min(offset + limit, total)
      const page: number[] = []
      for (let i = offset; i < end; i++) page.push(i)
      return page
    }
  }

  test("loads first page", async () => {
    const paginator = createPaginator(makeFetcher(10), 3)

    expect(paginator.items()).toEqual([])
    expect(paginator.hasMore()).toBe(true)

    await paginator.loadMore()

    expect(paginator.items()).toEqual([0, 1, 2])
    expect(paginator.hasMore()).toBe(true)
  })

  test("loadMore appends items", async () => {
    const paginator = createPaginator(makeFetcher(7), 3)

    await paginator.loadMore()
    expect(paginator.items()).toEqual([0, 1, 2])

    await paginator.loadMore()
    expect(paginator.items()).toEqual([0, 1, 2, 3, 4, 5])

    await paginator.loadMore()
    expect(paginator.items()).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(paginator.hasMore()).toBe(false)
  })

  test("hasMore returns false when page is smaller than pageSize", async () => {
    const paginator = createPaginator(makeFetcher(2), 5)

    await paginator.loadMore()

    expect(paginator.items()).toEqual([0, 1])
    expect(paginator.hasMore()).toBe(false)
  })

  test("reset clears items and restores hasMore", async () => {
    const paginator = createPaginator(makeFetcher(2), 5)

    await paginator.loadMore()
    expect(paginator.items()).toEqual([0, 1])
    expect(paginator.hasMore()).toBe(false)

    paginator.reset()
    expect(paginator.items()).toEqual([])
    expect(paginator.hasMore()).toBe(true)
  })
})
