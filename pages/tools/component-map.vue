<template>
	<meng-sub-page title="偏旁导图" subtitle="点偏旁，找出一家人" :full-height="true">
		<view class="page-body">
			<view class="search-card">
				<input
					class="search-input"
					type="text"
					:value="inputHanzi"
					maxlength="4"
					placeholder="输入一个汉字，如：她"
					confirm-type="search"
					@input="onInput"
					@confirm="applyHanzi"
				/>
				<button class="search-btn" type="primary" @click="applyHanzi">查看</button>
			</view>

			<view v-if="displayHanzi" class="focus-card">
				<text class="focus-char">{{ displayHanzi }}</text>
				<text class="focus-py font-pinyin">{{ focusPinyin || '—' }}</text>
			</view>

			<view v-if="similarRows.length" class="similar-block">
				<text class="similar-title">相似字（{{ similarRows.length }}）</text>
				<view class="similar-grid">
					<view
						v-for="item in similarRows"
						:key="'sim-' + item.hanzi"
						class="similar-cell"
						@click="openChar(item.hanzi)"
					>
						<text class="similar-py font-pinyin">{{ item.pinyin || '—' }}</text>
						<text class="similar-hanzi">{{ item.hanzi }}</text>
					</view>
				</view>
			</view>

			<view v-if="parts.length" class="parts-block">
				<text class="parts-title">选择偏旁</text>
				<scroll-view scroll-x class="parts-scroll" :show-scrollbar="false">
					<view class="parts-row">
						<view
							v-for="(p, i) in parts"
							:key="'part-' + i + '-' + p"
							class="part-chip"
							:class="{ 'part-chip--on': p === selectedPart }"
							@click="selectPart(p)"
						>
							<text class="part-chip-text">{{ p }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
			<view v-else-if="displayHanzi" class="hint-line">
				<text class="hint-text">暂未拆出偏旁，可换一个字试试</text>
			</view>

			<scroll-view v-if="selectedPart" scroll-y class="map-scroll">
				<component-mind-map
					:source-hanzi="displayHanzi"
					:part="selectedPart"
					:related-chars="relatedChars"
					empty-text="识字表里暂时没有更多相关字"
					@char-click="openChar"
					@source-click="speakSource"
				/>
			</scroll-view>
			<view v-else-if="!displayHanzi" class="intro">
				<text class="intro-title">怎么玩？</text>
				<text class="intro-line">1. 输入汉字，例如「她」</text>
				<text class="intro-line">2. 点选偏旁「女」或「也」</text>
				<text class="intro-line">3. 导图里找出同一偏旁的字</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import ComponentMindMap from '@/components/component-mind-map.vue'
import {
	getCharParts,
	listRelatedCharsForPart,
	firstComponentHanzi
} from '@/utils/char-components.js'
import { getSimilarShapeChars } from '@/repositories/dictionary-repository.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { speakHanzi } from '@/utils/speak-hanzi.js'

export default {
	components: { MengSubPage, ComponentMindMap },
	data() {
		return {
			inputHanzi: '',
			displayHanzi: '',
			focusPinyin: '',
			parts: [],
			selectedPart: '',
			relatedChars: [],
			similarRows: []
		}
	},
	onLoad(query) {
		const h = query && query.hanzi ? decodeURIComponent(String(query.hanzi)) : ''
		const one = firstComponentHanzi(h)
		if (one) {
			this.inputHanzi = one
			this.applyHanzi()
		}
	},
	methods: {
		onInput(e) {
			this.inputHanzi = (e && e.detail && e.detail.value) || ''
		},
		applyHanzi() {
			const h = firstComponentHanzi(this.inputHanzi)
			if (!h) {
				uni.showToast({ title: '请输入一个汉字', icon: 'none' })
				return
			}
			this.displayHanzi = h
			this.inputHanzi = h
			try {
				this.focusPinyin = String(spellDisplayString(h, 'poly', 'tone', 'array', 'low') || '')
			} catch (_) {
				this.focusPinyin = ''
			}
			this.parts = getCharParts(h)
			this.selectedPart = this.parts[0] || ''
			this.refreshRelated()
			this.refreshSimilar(h)
		},
		selectPart(p) {
			this.selectedPart = String(p || '').trim()
			this.refreshRelated()
		},
		async refreshRelated() {
			if (!this.selectedPart) {
				this.relatedChars = []
				return
			}
			try {
				this.relatedChars = await listRelatedCharsForPart(
					this.displayHanzi,
					this.selectedPart
				)
			} catch (_) {
				this.relatedChars = []
			}
		},
		async refreshSimilar(hanzi) {
			const h = firstComponentHanzi(hanzi || this.displayHanzi)
			if (!h) {
				this.similarRows = []
				return
			}
			try {
				const rows = await getSimilarShapeChars(h, 8)
				if (this.displayHanzi !== h) return
				this.similarRows = Array.isArray(rows) ? rows : []
			} catch (_) {
				if (this.displayHanzi === h) this.similarRows = []
			}
		},
		speakSource() {
			if (this.displayHanzi) speakHanzi(this.displayHanzi)
		},
		openChar(ch) {
			const h = firstComponentHanzi(ch)
			if (!h) return
			uni.navigateTo({
				url: `/pages/dictionary/result?hanzi=${encodeURIComponent(h)}`
			})
		}
	}
}
</script>

<style scoped>
.page-body {
	display: flex;
	flex-direction: column;
	min-height: 0;
	flex: 1;
	padding: 8rpx 4rpx 24rpx;
	box-sizing: border-box;
}

.search-card {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 16rpx 18rpx;
	background: #fffef9;
	border-radius: 20rpx;
	border: 1rpx solid var(--meng-border, #eee);
	box-sizing: border-box;
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 72rpx;
	padding: 0 20rpx;
	font-size: 30rpx;
	background: #fff8f0;
	border-radius: 14rpx;
	box-sizing: border-box;
}

.search-btn {
	flex-shrink: 0;
	margin: 0;
	height: 72rpx;
	line-height: 72rpx;
	padding: 0 28rpx;
	font-size: 28rpx;
	font-weight: 700;
	border-radius: 14rpx;
	background: #ff7043;
	color: #fff;
}

.search-btn::after {
	border: none;
}

.focus-card {
	margin-top: 16rpx;
	padding: 20rpx;
	display: flex;
	flex-direction: row;
	align-items: baseline;
	gap: 16rpx;
	background: linear-gradient(135deg, #fff8e7, #ffe8f0);
	border-radius: 20rpx;
	box-sizing: border-box;
}

.focus-char {
	font-size: 72rpx;
	font-weight: 800;
	color: #5d4037;
	line-height: 1;
}

.focus-py {
	font-size: 36rpx;
	color: #ff5722;
}

.similar-block {
	margin-top: 16rpx;
	padding: 18rpx 16rpx 16rpx;
	background: #fffef9;
	border-radius: 20rpx;
	border: 1rpx solid rgba(255, 170, 140, 0.35);
	box-sizing: border-box;
}

.similar-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #8d6e63;
	margin-bottom: 12rpx;
	padding-left: 4rpx;
}

.similar-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 12rpx;
}

.similar-cell {
	width: calc((100% - 36rpx) / 4);
	min-height: 108rpx;
	padding: 10rpx 6rpx 12rpx;
	border-radius: 16rpx;
	background: #fff8f2;
	border: 2rpx solid rgba(255, 154, 69, 0.28);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.similar-cell:active {
	opacity: 0.88;
	transform: scale(0.97);
}

.similar-py {
	font-size: 22rpx;
	line-height: 1.2;
	color: #a1887f;
	margin-bottom: 4rpx;
	text-align: center;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.similar-hanzi {
	font-size: 40rpx;
	font-weight: 700;
	line-height: 1.15;
	color: #5d4037;
}

.parts-block {
	margin-top: 16rpx;
}

.parts-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #8d6e63;
	margin-bottom: 10rpx;
	padding-left: 4rpx;
}

.parts-scroll {
	width: 100%;
	white-space: nowrap;
}

.parts-row {
	display: inline-flex;
	flex-direction: row;
	gap: 12rpx;
	padding: 4rpx 2rpx 8rpx;
}

.part-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 88rpx;
	padding: 14rpx 22rpx;
	border-radius: 999rpx;
	background: #fff;
	border: 2rpx solid rgba(255, 160, 120, 0.45);
	box-sizing: border-box;
}

.part-chip--on {
	background: #ff7043;
	border-color: #e64a19;
}

.part-chip-text {
	font-size: 36rpx;
	font-weight: 800;
	color: #5d4037;
}

.part-chip--on .part-chip-text {
	color: #fff;
}

.hint-line,
.intro {
	margin-top: 24rpx;
	padding: 28rpx 24rpx;
	background: #fffef9;
	border-radius: 16rpx;
}

.hint-text,
.intro-line {
	display: block;
	font-size: 26rpx;
	color: #8a8279;
	line-height: 1.55;
}

.intro-title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
	color: #5d4037;
	margin-bottom: 12rpx;
}

.map-scroll {
	flex: 1;
	height: 0;
	min-height: 420rpx;
	margin-top: 12rpx;
	padding: 12rpx 8rpx;
	background: #fffef9;
	border-radius: 20rpx;
	border: 1rpx solid rgba(255, 170, 140, 0.35);
	box-sizing: border-box;
}
</style>
