<template>
	<view class="page drill-page">
		<!-- 大厅 -->
		<view v-if="phase === 'lobby'" class="lobby">
			<text class="lobby-emoji">🎯</text>
			<text class="lobby-title">拼音大闯关</text>
			<text class="lobby-lead">听一听，选出正确的拼音，集小星星～</text>
			<text class="lobby-stats">累计 {{ statsSummary.plays }} 局 · {{ statsSummary.stars }} 颗星</text>

			<scroll-view scroll-x class="cat-scroll" :show-scrollbar="false">
				<view class="cat-row">
					<view
						v-for="cat in categories"
						:key="cat.key"
						class="cat-chip"
						:class="{ 'cat-chip--on': selectedCategory === cat.key }"
						@click="selectedCategory = cat.key"
					>
						<text class="cat-chip-emoji">{{ cat.emoji }}</text>
						<text class="cat-chip-label">{{ cat.label }}</text>
						<text v-if="bestStarsFor(cat.key) > 0" class="cat-chip-stars">
							{{ '★'.repeat(bestStarsFor(cat.key)) }}
						</text>
					</view>
				</view>
			</scroll-view>

			<text class="cat-desc">{{ selectedCategoryDesc }}</text>
			<text class="cat-meta">本关 {{ roundSize }} 题 · 每题 {{ optionCount }} 选 1</text>

			<button class="lobby-btn" type="default" :loading="starting" @click="startRound">
				开始闯关
			</button>
			<button class="lobby-ghost" type="default" @click="goBackPinyin">返回拼音学习</button>
		</view>

		<!-- 答题 -->
		<view v-else-if="phase === 'play'" class="play">
			<view class="play-head">
				<text class="play-emoji">{{ currentCategoryEmoji }}</text>
				<view class="play-head-text">
					<text class="play-tag">{{ currentCategoryLabel }}</text>
					<text class="play-step">第 {{ qIndex + 1 }} / {{ totalQ }} 题</text>
				</view>
			</view>

			<view class="track-row">
				<text
					v-for="n in totalQ"
					:key="n"
					class="track-dot"
					:class="n - 1 < qIndex ? 'track-done' : n - 1 === qIndex ? 'track-on' : 'track-off'"
				>●</text>
			</view>

			<view class="hear-card">
				<text class="hear-hint">听一听，点出你听到的拼音</text>
				<button class="hear-btn" type="default" @click="onHearAgain">🔊 再听一遍</button>
			</view>

			<view class="opts" :class="options.length >= 3 ? 'opts-3' : 'opts-2'">
				<view
					v-for="(opt, i) in options"
					:key="`${qIndex}-${i}-${opt}`"
					class="opt-card"
					:class="optCardClass(opt)"
					@click="onPick(opt)"
				>
					<pinyin-four-lines-row
						class="opt-pflr"
						:syllables="[opt]"
						:size="optionRowSize"
					/>
				</view>
			</view>

			<button class="play-ghost" type="default" @click="backToLobby">退出本关</button>
		</view>

		<!-- 结算 -->
		<view v-else class="done">
			<text class="done-stars" aria-hidden="true">{{ doneStarsDisplay }}</text>
			<text class="done-title">本关结束</text>
			<text class="done-score">答对 {{ score }} / {{ totalQ }} 题</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<button class="done-btn" type="default" @click="replayRound">再闯一次</button>
			<button class="done-primary" type="primary" @click="goBackPinyin">返回拼音学习</button>
		</view>
	</view>
</template>

<script>
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import {
	PINYIN_DRILL_CATEGORIES,
	PINYIN_DRILL_ROUND_SIZE,
	PINYIN_DRILL_OPTION_COUNT,
	getDrillPool,
	pickDrillTargets,
	buildDrillOptions
} from '@/data/pinyin-drill-pools.js'
import {
	loadDrillStats,
	recordDrillRound,
	playDrillSymbol,
	stopDrillAudio
} from '@/services/pinyin-drill-service.js'

export default {
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			phase: 'lobby',
			starting: false,
			categories: PINYIN_DRILL_CATEGORIES,
			selectedCategory: 'initial',
			roundSize: PINYIN_DRILL_ROUND_SIZE,
			optionCount: PINYIN_DRILL_OPTION_COUNT,
			stats: loadDrillStats(),
			pool: [],
			targets: [],
			qIndex: 0,
			totalQ: PINYIN_DRILL_ROUND_SIZE,
			targetSymbol: '',
			options: [],
			score: 0,
			attempt: 1,
			optLocked: false,
			lastStars: 0,
			pickedWrong: '',
			autoHearTimer: null
		}
	},
	computed: {
		statsSummary() {
			return {
				plays: this.stats.totalPlays || 0,
				stars: this.stats.totalStars || 0
			}
		},
		selectedCategoryDesc() {
			const cat = this.categories.find((c) => c.key === this.selectedCategory)
			return (cat && cat.desc) || ''
		},
		currentCategoryLabel() {
			const cat = this.categories.find((c) => c.key === this.selectedCategory)
			return (cat && cat.label) || ''
		},
		currentCategoryEmoji() {
			const cat = this.categories.find((c) => c.key === this.selectedCategory)
			return (cat && cat.emoji) || '🎯'
		},
		optionRowSize() {
			const t = this.targetSymbol || ''
			return t.length >= 4 ? 'compact' : 'grid'
		},
		doneStarsDisplay() {
			const n = this.lastStars || 0
			if (n <= 0) return '💪'
			return '★'.repeat(n)
		},
		doneEncourage() {
			if (this.lastStars >= 3) return '全对啦，小耳朵真灵！'
			if (this.lastStars >= 2) return '很棒，再练一轮争取三星～'
			if (this.lastStars >= 1) return '不错哦，多听几遍会更熟～'
			return '没关系，萌萌陪你多练几次～'
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: '拼音大闯关' })
		this.refreshStats()
	},
	onUnload() {
		this.clearAutoHear()
		stopDrillAudio()
	},
	methods: {
		refreshStats() {
			this.stats = loadDrillStats()
		},
		bestStarsFor(key) {
			return ((this.stats.byCategory || {})[key] || {}).bestStars || 0
		},
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		isBlendCategory() {
			return this.selectedCategory === 'blend'
		},
		startRound() {
			if (this.starting) return
			this.starting = true
			this.clearAutoHear()
			stopDrillAudio()
			try {
				const pool = getDrillPool(this.selectedCategory)
				if (pool.length < this.optionCount) {
					uni.showToast({ title: '题库太少，请换一类试试', icon: 'none' })
					return
				}
				this.pool = pool
				this.targets = pickDrillTargets(pool, this.roundSize)
				if (this.targets.length < 1) {
					uni.showToast({ title: '暂无题目', icon: 'none' })
					return
				}
				this.totalQ = this.targets.length
				this.score = 0
				this.qIndex = 0
				this.phase = 'play'
				this.loadQuestion(0)
			} finally {
				this.starting = false
			}
		},
		replayRound() {
			this.startRound()
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (this.phase === 'play' && this.targetSymbol) this.playCurrentSymbol()
			}, 380)
		},
		async playCurrentSymbol() {
			if (this.phase !== 'play' || !this.targetSymbol) return
			await playDrillSymbol(this.targetSymbol, { blend: this.isBlendCategory() })
		},
		loadQuestion(idx) {
			const sym = this.targets[idx]
			if (!sym) {
				this.finishRound()
				return
			}
			this.targetSymbol = sym
			this.options = buildDrillOptions(this.pool, sym, this.optionCount)
			this.attempt = 1
			this.optLocked = false
			this.pickedWrong = ''
			this.scheduleAutoHear()
		},
		optCardClass(opt) {
			if (!this.optLocked) return ''
			if (opt === this.targetSymbol) return 'opt-card--right'
			if (opt === this.pickedWrong) return 'opt-card--wrong'
			return 'opt-card--dim'
		},
		onHearAgain() {
			if (this.phase !== 'play' || this.optLocked) return
			this.clearAutoHear()
			this.playCurrentSymbol()
		},
		onPick(opt) {
			if (this.phase !== 'play' || this.optLocked) return
			const pick = String(opt || '').trim()
			if (pick === this.targetSymbol) {
				this.score++
				this.optLocked = true
				this.clearAutoHear()
				uni.showToast({ title: '答对啦', icon: 'none', duration: 700 })
				setTimeout(() => this.advanceQuestion(), 520)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.pickedWrong = pick
				uni.showToast({ title: '再听一遍试试', icon: 'none' })
				setTimeout(() => {
					if (this.phase === 'play' && !this.optLocked) this.playCurrentSymbol()
				}, 280)
				return
			}
			this.optLocked = true
			this.pickedWrong = pick
			uni.showToast({
				title: `正确：${this.targetSymbol}`,
				icon: 'none',
				duration: 1200
			})
			this.clearAutoHear()
			setTimeout(() => this.advanceQuestion(), 880)
		},
		advanceQuestion() {
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.finishRound()
				return
			}
			this.loadQuestion(this.qIndex)
		},
		finishRound() {
			this.clearAutoHear()
			stopDrillAudio()
			const { stars } = recordDrillRound(this.selectedCategory, this.score, this.totalQ)
			this.lastStars = stars
			this.refreshStats()
			this.phase = 'done'
		},
		backToLobby() {
			this.clearAutoHear()
			stopDrillAudio()
			this.phase = 'lobby'
			this.refreshStats()
		},
		goBackPinyin() {
			this.clearAutoHear()
			stopDrillAudio()
			uni.navigateBack({
				fail: () => {
					uni.switchTab({ url: '/pages/pinyin/index' })
				}
			})
		}
	}
}
</script>

<style scoped>
.drill-page {
	min-height: 100vh;
	padding: 24rpx;
	box-sizing: border-box;
	background: linear-gradient(180deg, #fff6fa 0%, var(--meng-page-bg) 42%);
}

.lobby {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 32rpx 8rpx 48rpx;
}

.lobby-emoji {
	font-size: 72rpx;
	line-height: 1.1;
	margin-bottom: 12rpx;
}

.lobby-title {
	font-size: 40rpx;
	font-weight: 800;
	color: var(--meng-text);
	letter-spacing: 2rpx;
}

.lobby-lead {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	text-align: center;
	line-height: 1.45;
	padding: 0 24rpx;
}

.lobby-stats {
	margin-top: 16rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

.cat-scroll {
	width: 100%;
	margin-top: 28rpx;
}

.cat-row {
	display: flex;
	flex-direction: row;
	white-space: nowrap;
	padding: 4rpx 4rpx 8rpx;
}

.cat-chip {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	min-width: 128rpx;
	padding: 16rpx 20rpx;
	margin-right: 14rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 2rpx solid rgba(255, 180, 200, 0.28);
	box-shadow: 0 6rpx 16rpx var(--meng-shadow);
}

.cat-chip--on {
	background: linear-gradient(135deg, #ffe0ec 0%, #ffd4f0 100%);
	border-color: var(--meng-chip-active-border);
	box-shadow: 0 8rpx 20rpx rgba(255, 120, 160, 0.2);
}

.cat-chip-emoji {
	font-size: 32rpx;
	line-height: 1.2;
}

.cat-chip-label {
	margin-top: 6rpx;
	font-size: 24rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
}

.cat-chip--on .cat-chip-label {
	color: #c44d6a;
}

.cat-chip-stars {
	margin-top: 4rpx;
	font-size: 18rpx;
	color: #e6a020;
	letter-spacing: 2rpx;
}

.cat-desc {
	margin-top: 20rpx;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	text-align: center;
	padding: 0 20rpx;
}

.cat-meta {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

.lobby-btn {
	width: 100%;
	max-width: 560rpx;
	margin-top: 36rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(145deg, var(--meng-accent-from) 0%, var(--meng-accent-to) 100%);
	border: none;
	border-radius: 999rpx;
	box-shadow: 0 12rpx 28rpx var(--meng-shadow-warm);
}

.lobby-ghost {
	margin-top: 20rpx;
	font-size: 26rpx;
	color: var(--meng-text-muted);
	background: transparent;
	border: none;
}

.lobby-ghost::after {
	border: none;
}

.play {
	padding: 8rpx 4rpx 32rpx;
}

.play-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.play-emoji {
	font-size: 48rpx;
}

.play-head-text {
	flex: 1;
	min-width: 0;
}

.play-tag {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.play-step {
	display: block;
	margin-top: 4rpx;
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.track-row {
	display: flex;
	flex-direction: row;
	justify-content: center;
	gap: 12rpx;
	margin-bottom: 20rpx;
}

.track-dot {
	font-size: 22rpx;
	line-height: 1;
}

.track-done {
	color: #6bae7d;
}

.track-on {
	color: #ff6b9d;
	font-size: 26rpx;
}

.track-off {
	color: #d8d0c8;
}

.hear-card {
	padding: 20rpx 22rpx;
	margin-bottom: 20rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 2rpx solid var(--meng-border);
	text-align: center;
}

.hear-hint {
	display: block;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	margin-bottom: 14rpx;
}

.hear-btn {
	display: inline-flex;
	margin: 0;
	padding: 0 32rpx;
	height: 64rpx;
	line-height: 64rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #c44d6a;
	background: var(--meng-chip-active-bg);
	border: 2rpx solid var(--meng-chip-active-border);
	border-radius: 999rpx;
}

.hear-btn::after {
	border: none;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.opts-3 .opt-card {
	width: calc((100% - 32rpx) / 3);
	max-width: 220rpx;
}

.opts-2 .opt-card {
	width: calc((100% - 16rpx) / 2);
	max-width: 280rpx;
}

.opt-card {
	box-sizing: border-box;
	padding: 8rpx 6rpx 12rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 3rpx solid var(--meng-border);
	box-shadow: 0 8rpx 20rpx var(--meng-shadow);
	transition:
		border-color 0.2s ease,
		transform 0.15s ease;
}

.opt-card:active {
	transform: scale(0.97);
}

.opt-card--right {
	border-color: #6bae7d;
	background: var(--meng-leaf-soft);
}

.opt-card--wrong {
	border-color: #e88;
	background: #fff5f5;
}

.opt-card--dim {
	opacity: 0.55;
}

.opt-pflr {
	width: 100%;
}

.play-ghost {
	font-size: 26rpx;
	color: var(--meng-text-muted);
	background: transparent;
	border: none;
}

.play-ghost::after {
	border: none;
}

.done {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48rpx 24rpx;
}

.done-stars {
	font-size: 56rpx;
	color: #e6a020;
	letter-spacing: 8rpx;
	margin-bottom: 16rpx;
}

.done-title {
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-text);
}

.done-score {
	margin-top: 12rpx;
	font-size: 28rpx;
	color: var(--meng-text-secondary);
}

.done-msg {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: var(--meng-tip-text);
	text-align: center;
	line-height: 1.5;
	padding: 0 32rpx;
}

.done-btn {
	width: 100%;
	max-width: 520rpx;
	margin-top: 40rpx;
	height: 80rpx;
	line-height: 80rpx;
	font-size: 28rpx;
	border-radius: 999rpx;
}

.done-primary {
	width: 100%;
	max-width: 520rpx;
	margin-top: 16rpx;
	height: 80rpx;
	line-height: 80rpx;
	font-size: 28rpx;
	border-radius: 999rpx;
}
</style>
