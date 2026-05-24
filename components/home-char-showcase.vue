<template>
	<view class="home-char-showcase" @click="goCharDetail">
		<view class="home-char-showcase__card">
			<!-- <text class="home-char-showcase__kicker">功能示范</text> -->
			<text class="home-char-showcase__lead">一个「字」看懂：笔顺、拼音、部首与笔画</text>

			<view class="home-char-showcase__main">
				<view class="home-char-showcase__stage">
					<hanzi-stroke-player
						ref="stroke"
						canvas-id="home-showcase-zi"
						char="字"
						:display-pinyin="showcasePinyin"
						:length="strokeSize"
						:loop-animate="true"
						:stroke-audio-enabled="false"
						:show-play-fab="false"
						hide-stroke-hint
						@ready-change="onStrokeReady"
						@animating-change="onAnimatingChange"
						@stroke-index="onStrokeIndexChange"
					/>
					<!-- <text v-if="currentStrokeLabel" class="home-char-showcase__stroke-line clamp-1">
						{{ currentStrokeLabel }}
					</text> -->
				</view>

				<view class="home-char-showcase__meta">
					<view class="home-char-showcase__hanzi-row">
						<text class="home-char-showcase__hanzi">拼音：</text>
						<view class="home-char-showcase__py-wrap">
							<pinyin-four-lines-row
								v-if="pinyinTokens.length"
								:syllables="pinyinTokens"
								size="md"
							/>
							<text v-else class="home-char-showcase__py-fallback font-pinyin">{{ showcasePinyin }}</text>
						</view>
					</view>

					<view class="home-char-showcase__chips">
						<view class="home-char-showcase__chip">
							<text class="home-char-showcase__chip-k">部首</text>
							<text class="home-char-showcase__chip-v">{{ meta.radical }}</text>
						</view>
						<view class="home-char-showcase__chip">
							<text class="home-char-showcase__chip-k">结构</text>
							<text class="home-char-showcase__chip-v">{{ meta.structure }}</text>
						</view>
						<view class="home-char-showcase__chip">
							<text class="home-char-showcase__chip-k">笔画</text>
							<text class="home-char-showcase__chip-v home-char-showcase__chip-v--num">{{
								meta.strokes
							}}</text>
						</view>
					</view>

					<view class="home-char-showcase__tags">
						<text class="home-char-showcase__tag">笔顺动画</text>
						<text class="home-char-showcase__tag">拼音学习</text>
						<text class="home-char-showcase__tag">查字详解</text>
						<text class="home-char-showcase__tag">课本同步</text>
					</view>
				</view>
			</view>

			<view class="home-char-showcase__foot">
				<text class="home-char-showcase__cta">点按查看「字」的完整解析 ›</text>
			</view>
		</view>
	</view>
</template>

<script>
import HanziStrokePlayer from '@/components/hanzi-stroke-player.vue'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { getCncharStrokeNameList } from '@/utils/stroke-order-audio.js'
import { openDictionaryTab } from '@/utils/dictionary-tab-nav.js'

const SHOWCASE_CHAR = '字'

export default {
	name: 'HomeCharShowcase',
	components: { HanziStrokePlayer, PinyinFourLinesRow },
	data() {
		return {
			strokeSize: 128,
			showcasePinyin: 'zì',
			meta: {
				radical: '—',
				structure: '—',
				strokes: '—'
			},
			strokeStarted: false,
			strokeIndex: 0,
			strokeNames: getCncharStrokeNameList(SHOWCASE_CHAR),
			_loopTimer: null
		}
	},
	computed: {
		pinyinTokens() {
			return splitPinyinDisplayTokens(this.showcasePinyin)
		},
		currentStrokeLabel() {
			if (!this.strokeNames.length) return ''
			const name = this.strokeNames[this.strokeIndex] || ''
			if (!name) return ''
			return `第 ${this.strokeIndex + 1} 笔 · ${name}`
		}
	},
	mounted() {
		this.loadMeta()
	},
	beforeUnmount() {
		this.clearLoopTimer()
		this.$refs.stroke?.stopAnimation?.()
	},
	methods: {
		clearLoopTimer() {
			if (this._loopTimer != null) {
				clearTimeout(this._loopTimer)
				this._loopTimer = null
			}
		},
		async loadMeta() {
			try {
				const entry = await getDictionaryEntry(SHOWCASE_CHAR, '首页示范')
				if (entry) {
					this.showcasePinyin =
						entry.pinyin ||
						spellDisplayString(SHOWCASE_CHAR, 'tone', 'poly', 'low') ||
						'zì'
					this.meta = {
						radical: entry.radical || '—',
						structure: entry.structure || '—',
						strokes: entry.strokes != null && entry.strokes !== '' ? entry.strokes : '—'
					}
					if (entry.strokeNames) {
						this.strokeNames = String(entry.strokeNames)
							.split(/[,，、\s]+/)
							.filter(Boolean)
					}
				}
			} catch (e) {
				console.warn('[home-char-showcase] loadMeta', e)
			}
		},
		onStrokeReady(ready) {
			if (!ready || this.strokeStarted) return
			this.strokeStarted = true
			this.$nextTick(() => {
				setTimeout(() => this.startStrokeLoop(), 400)
			})
		},
		startStrokeLoop() {
			const player = this.$refs.stroke
			if (!player || typeof player.playAnimation !== 'function') return
			player.playAnimation()
		},
		onAnimatingChange(animating) {
			if (animating) return
			this.clearLoopTimer()
			this._loopTimer = setTimeout(() => {
				this._loopTimer = null
				this.startStrokeLoop()
			}, 1600)
		},
		onStrokeIndexChange(idx) {
			this.strokeIndex = Number(idx) || 0
		},
		pauseShowcase() {
			this.clearLoopTimer()
			this.$refs.stroke?.stopAnimation?.()
		},
		resumeShowcase() {
			this.$nextTick(() => {
				setTimeout(() => this.startStrokeLoop(), 520)
			})
		},
		goCharDetail() {
			this.pauseShowcase()
			openDictionaryTab(SHOWCASE_CHAR)
		}
	}
}
</script>

<style scoped>
.home-char-showcase {
	margin-bottom: 20rpx;
	box-sizing: border-box;
}

.home-char-showcase__card {
	padding: 22rpx 20rpx 18rpx;
	border-radius: 28rpx;
	background: var(--meng-card-solid);
	border: 2rpx solid var(--meng-border-warm);
	box-shadow: 0 10rpx 28rpx var(--meng-shadow);
	box-sizing: border-box;
}

.home-char-showcase__kicker {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: var(--meng-accent-solid);
	letter-spacing: 2rpx;
}

.home-char-showcase__lead {
	display: block;
	margin-top: 6rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text);
	line-height: 1.4;
}

.home-char-showcase__main {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 16rpx;
	margin-top: 18rpx;
}

.home-char-showcase__stage {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.home-char-showcase__stage :deep(.hanzi-stroke-player) {
	align-items: center;
}

.home-char-showcase__stroke-line {
	margin-top: 6rpx;
	max-width: 200rpx;
	font-size: 20rpx;
	color: var(--meng-text-secondary);
	text-align: center;
}

.home-char-showcase__meta {
	flex: 1;
	min-width: 0;
}

.home-char-showcase__hanzi-row {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	gap: 12rpx;
	margin-bottom: 14rpx;
}

.home-char-showcase__hanzi {
	font-size: 56rpx;
	font-weight: 800;
	color: var(--meng-chocolate);
	line-height: 1;
}

.home-char-showcase__py-wrap {
	flex: 1;
	min-width: 0;
}

.home-char-showcase__py-fallback {
	font-size: 32rpx;
	color: var(--meng-text);
}

.home-char-showcase__chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-bottom: 12rpx;
}

.home-char-showcase__chip {
	flex: 0 0 calc(33.33% - 8rpx);
	max-width: calc(33.33% - 8rpx);
	padding: 10rpx 8rpx;
	border-radius: 14rpx;
	background: var(--meng-page-bg);
	border: 1rpx solid var(--meng-border);
	box-sizing: border-box;
	text-align: center;
}

.home-char-showcase__chip-k {
	display: block;
	font-size: 20rpx;
	color: var(--meng-text-muted);
}

.home-char-showcase__chip-v {
	display: block;
	margin-top: 4rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.home-char-showcase__chip-v--num {
	color: var(--meng-accent-solid);
}

.home-char-showcase__tags {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8rpx;
}

.home-char-showcase__tag {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	color: var(--meng-leaf);
	background: var(--meng-leaf-soft);
	border: 1rpx solid rgba(126, 200, 160, 0.35);
}

.home-char-showcase__foot {
	margin-top: 14rpx;
	padding-top: 12rpx;
	border-top: 1rpx dashed var(--meng-border);
}

.home-char-showcase__cta {
	display: block;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
	color: var(--meng-accent-solid);
}

.clamp-1 {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
