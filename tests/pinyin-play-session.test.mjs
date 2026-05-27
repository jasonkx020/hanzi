import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
	createPinyinPlayScopeState,
	PINYIN_PLAY_SCOPES,
	resetPinyinPlayScopesForTest
} from '../utils/pinyin-play-session-scopes.js'

describe('pinyin-play-session-scopes', () => {
	beforeEach(() => {
		resetPinyinPlayScopesForTest()
	})

	it('scoped sessions are independent', () => {
		const a = createPinyinPlayScopeState('test-a')
		const b = createPinyinPlayScopeState('test-b')
		const ga = a.begin()
		const gb = b.begin()
		assert.equal(a.isStale(ga), false)
		assert.equal(b.isStale(gb), false)
		a.cancel()
		assert.equal(a.isStale(ga), true)
		assert.equal(b.isStale(gb), false)
	})

	it('exports standard scope ids', () => {
		assert.equal(PINYIN_PLAY_SCOPES.LESSON_CARD, 'lesson-card')
		assert.equal(PINYIN_PLAY_SCOPES.PINYIN_INDEX, 'pinyin-index')
		assert.equal(PINYIN_PLAY_SCOPES.GAME_HEAR, 'game-hear')
	})
})

describe('pinyin-play-session run semantics (state only)', () => {
	beforeEach(() => {
		resetPinyinPlayScopesForTest()
	})

	it('new begin invalidates previous gen', async () => {
		const scope = createPinyinPlayScopeState('run')
		const g1 = scope.begin()
		const order = []
		const waitFirst = (async () => {
			order.push('start')
			await new Promise((r) => setTimeout(r, 30))
			if (!scope.isStale(g1)) order.push('stale-ok')
		})()
		await new Promise((r) => setTimeout(r, 5))
		scope.begin()
		await waitFirst
		assert.deepEqual(order, ['start'])
	})
})
