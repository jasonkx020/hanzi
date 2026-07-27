<template>
	<view class="home-char-showcase" @click="goCharDetail">
		<view class="home-char-showcase__card">
			<!-- <text class="home-char-showcase__kicker">功能示范</text> -->
			<text class="home-char-showcase__lead">跟萌萌认字：笔顺、拼音、部首一眼看懂</text>

			<view class="home-char-showcase__main">
				<view class="home-char-showcase__stage">
					<hanzi-stroke-player
						ref="stroke"
						canvas-id="home-showcase-zi"
						char="字"
						:display-pinyin="showcasePinyin"
						:length="strokeSize"
						:loop-animate="false"
						:stroke-audio-enabled="false"
						:show-play-fab="false"
						hide-stroke-hint
						@ready-change="onStrokeReady"
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
						<text class="home-char-showcase__tag">静态笔顺</text>
						<text class="home-char-showcase__tag">拼音跟读</text>
						<text class="home-char-showcase__tag">课本同步</text>
						<text class="home-char-showcase__tag">一字一课</text>
					</view>
				</view>
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
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'

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
			/* 首页常驻：只展示静态字形，不自动播笔顺动画 */
		},
		onStrokeIndexChange(idx) {
			this.strokeIndex = Number(idx) || 0
		},
		pauseShowcase() {
			this.clearLoopTimer()
			this.$refs.stroke?.stopAnimation?.()
		},
		resumeShowcase() {
			/* 首页不恢复循环动画 */
			this.pauseShowcase()
		},
		goCharDetail() {
			this.pauseShowcase()
			startTextbookLearning()
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

.clamp-1 {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
