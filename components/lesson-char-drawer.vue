<!--
  @file lesson-char-drawer.vue
  @layer L1 表现层
  @description 课次字卡顶部抽屉：笔顺动画 + 组词分页；点遮罩收起
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view v-if="visible" class="lcd-root">
		<view class="lcd-mask" @click="onClose" @touchmove.stop.prevent />
		<view class="lcd-panel" @click.stop @touchmove.stop.prevent>
			<!-- 与原先关闭按钮同高占位，保持四线三格距顶距离 -->
			<view class="lcd-top" aria-hidden="true">
				<view class="lcd-top-spacer" />
				<view class="lcd-btn lcd-btn--close lcd-btn--ph">
					<text class="lcd-close-icon">×</text>
				</view>
			</view>
			<view class="lcd-stroke-block">
				<view v-if="pinyinSyllables.length" class="lcd-py-row">
					<pinyin-four-lines-row :syllables="pinyinSyllables" size="compact" />
				</view>
				<view class="lcd-stroke-wrap">
					<view class="lcd-stroke-stage">
						<!-- 弹层首帧即见田字格；canvas/字形可稍后叠上 -->
						<view class="lcd-tianzi" aria-hidden="true">
							<view class="lcd-tianzi-border" />
							<view class="lcd-tianzi-h" />
							<view class="lcd-tianzi-v" />
							<view class="lcd-tianzi-d1" />
							<view class="lcd-tianzi-d2" />
						</view>
						<hanzi-stroke-player
							v-if="playerMounted"
							ref="strokePlayer"
							:char="displayChar"
							:display-pinyin="pinyinLabel"
							:length="180"
							:preview-only="true"
							:show-play-fab="false"
							idle-mode="preview"
							canvas-id="lesson-char-drawer-stroke"
							@ready-change="onStrokeReady"
						/>
					</view>
				</view>
			</view>

			<view class="lcd-words">
				<view class="lcd-words-head">
					<text class="lcd-words-title">组词</text>
					<view class="lcd-words-actions">
						<view
							v-if="canNextWords"
							class="lcd-pill lcd-pill--next"
							@click.stop="onNextWords"
						>
							<text class="lcd-pill-txt">下一页</text>
						</view>
						<!-- 占位：取消详情入口，保留与「下一页」并排宽度 -->
						<view class="lcd-pill lcd-pill--detail lcd-pill--ph" aria-hidden="true">
							<text class="lcd-pill-txt">详情</text>
						</view>
					</view>
				</view>
				<view v-if="displayWords.length" class="lcd-words-chips">
					<text
						v-for="(w, i) in displayWords"
						:key="'lcd-w-' + wordsPage + '-' + i"
						class="lcd-word-chip"
					>{{ w }}</text>
				</view>
				<text v-else class="lcd-words-empty">{{ wordsLoading ? '组词加载中…' : '暂无组词' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import HanziStrokePlayer from '@/components/hanzi-stroke-player.vue'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import { sleep, stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'
import { stopStrokeOrderAudio } from '@/utils/stroke-order-audio.js'
import pinyinPlayScopeMixin, { PINYIN_PLAY_SCOPES } from '@/mixins/pinyin-play-scope.js'

const WORDS_PAGE_SIZE = 4
/** 整字读音播完后再开笔顺的短间隔 */
const AFTER_READING_TO_STROKE_MS = 360

function normalizeWords(raw) {
	const out = []
	const seen = Object.create(null)
	for (const w of raw || []) {
		const k = String(w || '').trim()
		if (!k || k === '暂无组词' || seen[k]) continue
		seen[k] = 1
		out.push(k)
	}
	const two = out.filter((w) => w.length === 2)
	const rest = out.filter((w) => w.length !== 2)
	return [...two, ...rest]
}

export default {
	name: 'LessonCharDrawer',
	components: { HanziStrokePlayer, PinyinFourLinesRow },
	mixins: [pinyinPlayScopeMixin],
	pinyinPlayScope: PINYIN_PLAY_SCOPES.LESSON_CHAR_DRAWER,
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		hanzi: {
			type: String,
			default: ''
		},
		pinyin: {
			type: String,
			default: ''
		}
	},
	emits: ['close', 'detail'],
	data() {
		return {
			playerMounted: false,
			charWords: [],
			wordsPage: 0,
			wordsLoading: false,
			wordsGen: 0,
			openGen: 0,
			/** 本轮 open 是否已启动「读字→笔顺」流水线，防 ready 重复触发掐断 */
			pipelineStartedGen: 0,
			strokePlayTimer: null
		}
	},
	computed: {
		displayChar() {
			const c = String(this.hanzi || '').trim().charAt(0)
			return c || ''
		},
		pinyinLabel() {
			const s = String(this.pinyin || '').replace(/\s+/g, ' ').trim()
			return s && s !== '-' ? s : ''
		},
		/** 与课次字卡外层一致：四线三格音节列表 */
		pinyinSyllables() {
			const s = this.pinyinLabel
			if (!s) return []
			const tokens = splitPinyinDisplayTokens(s)
			return tokens.length ? tokens : [s]
		},
		allWords() {
			return normalizeWords(this.charWords)
		},
		displayWords() {
			const list = this.allWords
			if (!list.length) return []
			const pages = Math.max(1, Math.ceil(list.length / WORDS_PAGE_SIZE))
			const page = ((Number(this.wordsPage) % pages) + pages) % pages
			const start = page * WORDS_PAGE_SIZE
			return list.slice(start, start + WORDS_PAGE_SIZE)
		},
		canNextWords() {
			return this.allWords.length > WORDS_PAGE_SIZE
		}
	},
	watch: {
		visible(v) {
			if (v) this.onOpen()
			else this.onHideInternal()
		},
		hanzi() {
			if (this.visible) this.onOpen()
		}
	},
	beforeUnmount() {
		this.onHideInternal()
	},
	methods: {
		clearStrokePlayTimer() {
			if (this.strokePlayTimer != null) {
				clearTimeout(this.strokePlayTimer)
				this.strokePlayTimer = null
			}
		},
		/** 同步停播：禁止 setTimeout(0) 再 stop，否则会掐断随后启动的整字读音 */
		syncStopAudio() {
			try {
				this._pyPlay?.cancel?.()
			} catch (_) {}
			try {
				stopStrokeOrderAudio()
			} catch (_) {}
			try {
				stopLocalPinyinAudio()
				stopHanziSpeech()
			} catch (_) {}
		},
		onOpen() {
			this.openGen++
			const gen = this.openGen
			/**
			 * 先占住 pipelineStartedGen，避免 stopStroke→旧 player ready
			 * 在换字时误开读字流水线、掐断随后挂载的笔顺音。
			 */
			this.pipelineStartedGen = gen
			this.clearStrokePlayTimer()
			this.stopStroke()
			this.wordsPage = 0
			this.charWords = []
			this.syncStopAudio()
			this.pipelineStartedGen = 0
			/** 与弹层同帧挂载，田字格/预览字不再晚一拍像卡住 */
			this.playerMounted = !!this.displayChar
			this.loadWords()
		},
		onHideInternal() {
			this.openGen++
			this.pipelineStartedGen = 0
			this.clearStrokePlayTimer()
			this.stopStroke()
			this.playerMounted = false
			this.syncStopAudio()
		},
		stopStroke() {
			try {
				this.$refs.strokePlayer?.stopAnimation?.()
			} catch (_) {}
		},
		async onStrokeReady(ready) {
			if (!ready || !this.visible || !this.playerMounted) return
			const gen = this.openGen
			if (this.pipelineStartedGen === gen) return
			this.pipelineStartedGen = gen
			this.clearStrokePlayTimer()
			const ch = this.displayChar
			const py = this.pinyinLabel
			if (!ch) return
			try {
				await this._pyPlay.run(({ isCancelled }) =>
					playLessonTargetReading(ch, py, {
						isCancelled: () => isCancelled() || gen !== this.openGen || !this.visible
					})
				)
			} catch (e) {
				console.warn('[lesson-char-drawer] char reading', e)
			}
			if (gen !== this.openGen || !this.visible) return
			try {
				await sleep(AFTER_READING_TO_STROKE_MS)
			} catch (_) {}
			if (gen !== this.openGen || !this.visible) return
			try {
				this.$refs.strokePlayer?.playAnimation?.()
			} catch (_) {}
		},
		async loadWords() {
			const ch = this.displayChar
			const gen = ++this.wordsGen
			if (!ch) {
				this.charWords = []
				this.wordsLoading = false
				return
			}
			this.wordsLoading = true
			try {
				const entry = await getDictionaryEntry(ch)
				if (gen !== this.wordsGen) return
				this.charWords = Array.isArray(entry?.words) ? entry.words : []
			} catch (e) {
				console.warn('[lesson-char-drawer] loadWords', e)
				if (gen !== this.wordsGen) return
				this.charWords = []
			} finally {
				if (gen === this.wordsGen) this.wordsLoading = false
			}
		},
		onNextWords() {
			if (!this.canNextWords) return
			const pages = Math.ceil(this.allWords.length / WORDS_PAGE_SIZE)
			this.wordsPage = (Number(this.wordsPage) + 1) % pages
		},
		onDetail() {
			if (!this.displayChar) return
			this.$emit('detail', {
				hanzi: this.displayChar,
				pinyin: this.pinyinLabel
			})
		},
		onClose() {
			this.$emit('close')
		}
	}
}
</script>

<style scoped>
.lcd-root {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
}

.lcd-mask {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(40, 28, 24, 0.42);
}

.lcd-panel {
	position: relative;
	z-index: 1;
	max-height: 86vh;
	/* 状态栏 + 额外间距（与有关闭钮时一致） */
	padding: calc(24rpx + constant(safe-area-inset-top)) 24rpx 28rpx;
	padding: calc(24rpx + env(safe-area-inset-top, 0px)) 24rpx 28rpx;
	border-radius: 0 0 32rpx 32rpx;
	background: #fffdf9;
	box-shadow: 0 12rpx 40rpx rgba(44, 36, 25, 0.14);
	box-sizing: border-box;
	overflow-y: auto;
	transform: translateZ(0);
	animation: lcd-panel-in 200ms ease-out;
}

@keyframes lcd-panel-in {
	from {
		transform: translate3d(0, -18%, 0);
		opacity: 0.72;
	}
	to {
		transform: translate3d(0, 0, 0);
		opacity: 1;
	}
}

.lcd-top {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 8rpx;
}

.lcd-top-spacer {
	flex: 1;
	min-width: 0;
}

.lcd-btn {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
}

.lcd-btn--close {
	width: 64rpx;
	height: 64rpx;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f0ebe6;
	border: 1rpx solid rgba(0, 0, 0, 0.06);
}

.lcd-btn--ph {
	visibility: hidden;
	pointer-events: none;
}

.lcd-close-icon {
	font-size: 44rpx;
	font-weight: 500;
	color: #6d5e52;
	line-height: 1;
	margin-top: -4rpx;
}

.lcd-stroke-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
	margin-bottom: 8rpx;
}

.lcd-py-row {
	width: 100%;
	max-width: 360rpx;
	min-width: 0;
	padding: 8rpx 8rpx 6rpx;
	box-sizing: border-box;
	background: #fff5f8;
	border-radius: 14rpx;
	border: 1rpx solid rgba(255, 200, 180, 0.4);
}

.lcd-stroke-wrap {
	display: flex;
	justify-content: center;
	padding: 0 56rpx 8rpx 24rpx;
	box-sizing: border-box;
	overflow: visible;
}

/** length=180 + 30，与 hanzi-stroke-player 外壳一致 */
.lcd-stroke-stage {
	position: relative;
	width: 210px;
	min-height: 210px;
	flex-shrink: 0;
}

/** 弹层打开瞬间可见的 CSS 田字格；字形 canvas 叠在上面 */
.lcd-tianzi {
	position: absolute;
	left: 0;
	top: 0;
	width: 210px;
	height: 210px;
	box-sizing: border-box;
	border-radius: 16rpx;
	background: #fffefb;
	pointer-events: none;
	z-index: 0;
}

.lcd-tianzi-border {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	border: 2px solid #e0cfc0;
	border-radius: 16rpx;
	box-sizing: border-box;
}

.lcd-tianzi-h,
.lcd-tianzi-v {
	position: absolute;
	background: #d4c4b4;
	opacity: 0.9;
}

.lcd-tianzi-h {
	left: 6%;
	right: 6%;
	top: 50%;
	height: 1px;
	margin-top: -0.5px;
}

.lcd-tianzi-v {
	top: 6%;
	bottom: 6%;
	left: 50%;
	width: 1px;
	margin-left: -0.5px;
}

.lcd-tianzi-d1,
.lcd-tianzi-d2 {
	position: absolute;
	left: 10%;
	right: 10%;
	top: 50%;
	height: 1px;
	background: #ebe0d6;
	opacity: 0.95;
}

.lcd-tianzi-d1 {
	transform: rotate(45deg);
}

.lcd-tianzi-d2 {
	transform: rotate(-45deg);
}

.lcd-stroke-wrap /deep/ .hanzi-stroke-player,
.lcd-stroke-wrap ::v-deep .hanzi-stroke-player {
	position: relative;
	z-index: 1;
}

.lcd-stroke-wrap /deep/ .tianzi-shell,
.lcd-stroke-wrap ::v-deep .tianzi-shell {
	background: transparent;
}

/* 播放钮再靠右，避免压住田字格 */
.lcd-stroke-wrap /deep/ .play-fab,
.lcd-stroke-wrap ::v-deep .play-fab {
	right: -52rpx;
}

.lcd-words {
	padding-top: 8rpx;
	border-top: 1rpx solid rgba(255, 180, 200, 0.35);
}

.lcd-words-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.lcd-words-title {
	font-size: 26rpx;
	font-weight: 800;
	color: #2c2419;
	line-height: 1.2;
}

.lcd-words-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
	gap: 12rpx;
	flex-shrink: 0;
}

.lcd-pill {
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
}

.lcd-pill--next {
	background: #e3f2fd;
}

.lcd-pill--detail {
	background: #ffd4f0;
	border: 1rpx solid rgba(255, 120, 160, 0.35);
}

.lcd-pill--ph {
	visibility: hidden;
	pointer-events: none;
}

.lcd-pill-txt {
	font-size: 22rpx;
	font-weight: 700;
	line-height: 1.2;
}

.lcd-pill--next .lcd-pill-txt {
	color: #1565c0;
}

.lcd-pill--detail .lcd-pill-txt {
	color: #c44d6a;
}

.lcd-words-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8rpx 10rpx;
}

.lcd-word-chip {
	padding: 8rpx 18rpx;
	font-size: 46rpx;
	font-weight: 700;
	color: #5d4037;
	background: #fff5f8;
	border-radius: 14rpx;
	border: 1rpx solid rgba(255, 160, 190, 0.35);
	line-height: 1.25;
}

.lcd-words-empty {
	font-size: 24rpx;
	color: #9a8a80;
}
</style>
