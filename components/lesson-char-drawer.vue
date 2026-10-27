<!--
  @file lesson-char-drawer.vue
  @layer L1 表现层
  @description 课次字卡底部抽屉：笔顺动画 + 组词分页；详情进详情页，仅关闭按钮收起
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view v-if="visible" class="lcd-root">
		<view class="lcd-mask" @touchmove.stop.prevent />
		<view class="lcd-panel" @touchmove.stop.prevent>
			<view class="lcd-handle" />
			<view class="lcd-top">
				<view class="lcd-title-block">
					<text class="lcd-hanzi">{{ displayChar }}</text>
					<text v-if="pinyinLabel" class="lcd-pinyin">{{ pinyinLabel }}</text>
				</view>
				<view class="lcd-actions">
					<view class="lcd-btn lcd-btn--close" @click.stop="onClose" aria-label="关闭">
						<text class="lcd-close-icon">×</text>
					</view>
				</view>
			</view>

			<view class="lcd-stroke-wrap">
				<hanzi-stroke-player
					v-if="playerMounted"
					ref="strokePlayer"
					:char="displayChar"
					:display-pinyin="pinyinLabel"
					:length="180"
					:preview-only="true"
					idle-mode="preview"
					canvas-id="lesson-char-drawer-stroke"
					@ready-change="onStrokeReady"
				/>
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
						<view class="lcd-pill lcd-pill--detail" @click.stop="onDetail">
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
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'

const WORDS_PAGE_SIZE = 4
/** 字形预览就绪后，再过多久自动播笔顺 */
const PREVIEW_TO_STROKE_MS = 400

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
	components: { HanziStrokePlayer },
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
		onOpen() {
			this.openGen++
			this.clearStrokePlayTimer()
			stopLocalPinyinAudio()
			stopHanziSpeech()
			this.stopStroke()
			this.wordsPage = 0
			this.charWords = []
			/** 立刻显示字形；组词异步，不挡挂载；预览就绪后再播笔顺 */
			this.playerMounted = !!this.displayChar
			this.loadWords()
		},
		onHideInternal() {
			this.openGen++
			this.clearStrokePlayTimer()
			stopLocalPinyinAudio()
			stopHanziSpeech()
			this.stopStroke()
			this.playerMounted = false
		},
		stopStroke() {
			try {
				this.$refs.strokePlayer?.stopAnimation?.()
			} catch (_) {}
		},
		onStrokeReady(ready) {
			if (!ready || !this.visible || !this.playerMounted) return
			const gen = this.openGen
			this.clearStrokePlayTimer()
			this.strokePlayTimer = setTimeout(() => {
				this.strokePlayTimer = null
				if (gen !== this.openGen || !this.visible) return
				try {
					this.$refs.strokePlayer?.playAnimation?.()
				} catch (_) {}
			}, PREVIEW_TO_STROKE_MS)
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
	justify-content: flex-end;
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
	padding: 10rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));
	border-radius: 32rpx 32rpx 0 0;
	background: #fffdf9;
	box-shadow: 0 -12rpx 40rpx rgba(44, 36, 25, 0.14);
	box-sizing: border-box;
	overflow-y: auto;
}

.lcd-handle {
	width: 64rpx;
	height: 8rpx;
	margin: 4rpx auto 16rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.12);
}

.lcd-top {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 12rpx;
}

.lcd-title-block {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: row;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 8rpx 14rpx;
}

.lcd-hanzi {
	font-size: 48rpx;
	font-weight: 800;
	color: #2c2419;
	line-height: 1.1;
}

.lcd-pinyin {
	font-size: 26rpx;
	font-weight: 600;
	color: #8a6a78;
}

.lcd-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	flex-shrink: 0;
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

.lcd-close-icon {
	font-size: 44rpx;
	font-weight: 500;
	color: #6d5e52;
	line-height: 1;
	margin-top: -4rpx;
}

.lcd-stroke-wrap {
	display: flex;
	justify-content: center;
	padding: 8rpx 56rpx 16rpx 24rpx;
	box-sizing: border-box;
	overflow: visible;
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
