import test from 'node:test'
import assert from 'node:assert/strict'
import { QUALITY, createQualityMonitor, renderPixelRatio } from './sceneQuality.js'

test('Retina and ultrawide buffers respect the pixel budget', () => {
  for (const [width, height, ratio] of [[390, 844, 3], [3840, 2160, 2], [1280, 720, 1]]) {
    for (const quality of QUALITY) {
      const actual = renderPixelRatio(ratio, width, height, quality)
      assert(actual <= ratio)
      assert(actual * actual * width * height <= 2_000_001)
    }
  }
})

test('Sustained slow rendering reduces quality with a cooldown', () => {
  const monitor = createQualityMonitor()
  const changes = []
  for (let i = 0; i < 280; i++) {
    const next = monitor.sample(34)
    if (next !== null) changes.push([i, next])
  }
  assert.deepEqual(changes.map(([, value]) => value), [1, 2])
  assert(changes[1][0] - changes[0][0] > 100)
})

test('Idle gaps and isolated spikes do not downgrade a smooth scene', () => {
  const monitor = createQualityMonitor()
  for (let i = 0; i < 450; i++) {
    assert.equal(monitor.sample(i % 50 === 0 ? 5000 : i % 30 === 0 ? 50 : 16.7), null)
  }
})
