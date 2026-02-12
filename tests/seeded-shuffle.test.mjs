import test from 'node:test'
import assert from 'node:assert/strict'

function hashSeed(input) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle(words, seedText) {
  const arr = [...words]
  let seed = hashSeed(seedText) || 1

  const nextRand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

test('seededShuffle should be deterministic', () => {
  const words = ['apple', 'banana', 'cherry', 'date', 'elderberry']
  const seed1 = 'question_123|template_abc'
  
  const result1 = seededShuffle(words, seed1)
  const result2 = seededShuffle(words, seed1)
  
  // 两次计算结果必须完全一致
  assert.deepEqual(result1, result2)
})

test('seededShuffle should vary with seed', () => {
  const words = ['apple', 'banana', 'cherry', 'date', 'elderberry']
  const seed1 = 'seed_A'
  const seed2 = 'seed_B'
  
  const result1 = seededShuffle(words, seed1)
  const result2 = seededShuffle(words, seed2)
  
  // 种子不同，结果应该不同 (虽然理论上有极小碰撞概率，但在5个元素下几乎不可能)
  assert.notDeepEqual(result1, result2)
})

test('seededShuffle should not modify original array', () => {
  const words = ['A', 'B', 'C']
  const original = [...words]
  seededShuffle(words, 'seed')
  assert.deepEqual(words, original)
})
