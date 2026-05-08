<template>
	<view class="page">
		<view class="bar">
			<text class="bar-text">{{ summary }}</text>
		</view>
		<view class="search-card">
			<view class="mode-switch">
				<view class="mode-btn" :class="searchMode === 'pinyin' ? 'mode-btn-active' : ''" @click="searchMode = 'pinyin'">
					<text class="mode-btn-text">拼音输入</text>
				</view>
				<view class="mode-btn" :class="searchMode === 'handwrite' ? 'mode-btn-active' : ''" @click="searchMode = 'handwrite'">
					<text class="mode-btn-text">手写输入</text>
				</view>
			</view>
			<view v-if="searchMode === 'pinyin'" class="mode-panel">
				<input
					v-model="pinyinKeyword"
					class="pinyin-input"
					type="text"
					placeholder="输入拼音，如：tian / tian1"
					confirm-type="search"
				/>
				<text class="mode-tip">当前结果：{{ filteredChars.length }} 字</text>
			</view>
			<view v-else class="mode-panel">
				<button type="default" size="mini" @click="openHandwritePad">打开手写板</button>
				<text class="mode-tip">手写模式已开启，可在手写板练习并回查汉字。</text>
			</view>
		</view>
		<view class="placeholder">
			<text class="p-title">查字</text>
			<text class="p-desc">当前可检索 {{ filteredChars.length }} 字（App 读 plus.sqlite；其它端无库时为 0）。</text>
			<button type="primary" size="mini" @click="goSettings">筛选条件</button>
			<button class="mt" type="default" size="mini" @click="openDemoChar">打开示例生字页</button>
			<button class="mt" type="default" size="mini" @click="reloadDb">刷新数据</button>
		</view>
		<view v-if="filteredChars.length" class="grid">
			<view
				v-for="(row, i) in filteredChars"
				:key="row.id != null ? row.id : i"
				class="cell"
				@click="openChar(row)"
			>
				<text class="cell-char">{{ row.hanzi }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'

export default {
	data() {
		return {
			summary: '',
			chars: [],
			searchMode: 'pinyin',
			pinyinKeyword: ''
		}
	},
	computed: {
		filteredChars() {
			if (this.searchMode !== 'pinyin') return this.chars
			const kw = this.normalizePinyin(this.pinyinKeyword)
			if (!kw) return this.chars
			return this.chars.filter((row) => {
				const py = this.normalizePinyin(row?.pinyin || '')
				return py.includes(kw)
			})
		}
	},
	onShow() {
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb()
	},
	methods: {
		async reloadDb() {
			this.chars = await queryCurriculumChars(getCurriculumPrefs())
		},
		openChar(row) {
			uni.navigateTo({
				url: `/pages/dictionary/result?hanzi=${encodeURIComponent(row.hanzi || '')}&pinyin=${encodeURIComponent(row.pinyin || '')}&lesson=${encodeURIComponent(row.lesson_hint || '')}`
			})
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		openHandwritePad() {
			uni.navigateTo({ url: '/pages/tools/stroke' })
		},
		normalizePinyin(s) {
			return String(s || '')
				.toLowerCase()
				.replace(/\s+/g, '')
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
		},
		openDemoChar() {
			uni.navigateTo({
				url: `/pages/dictionary/result?hanzi=${encodeURIComponent('天')}&pinyin=${encodeURIComponent('tiān')}&lesson=${encodeURIComponent('识字1·天地人')}`
			})
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f4f1ea; padding: 24rpx; box-sizing: border-box; }
.bar { padding: 16rpx 20rpx; background: #fffef9; border-radius: 12rpx; margin-bottom: 24rpx; }
.bar-text { font-size: 24rpx; color: #4a453f; }
.search-card { margin-bottom: 20rpx; padding: 20rpx; background: #fff; border-radius: 16rpx; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 12rpx; }
.mode-btn { height: 68rpx; border-radius: 10rpx; background: #f3efe6; display: flex; align-items: center; justify-content: center; }
.mode-btn-active { background: #ffe2b8; }
.mode-btn-text { font-size: 26rpx; color: #4a453f; font-weight: 600; }
.mode-panel { display: flex; flex-direction: column; gap: 10rpx; }
.pinyin-input { height: 72rpx; border: 1px solid #e0dbcf; border-radius: 10rpx; padding: 0 18rpx; background: #fffef9; font-size: 28rpx; }
.mode-tip { font-size: 23rpx; color: #8a8279; }
.placeholder { padding: 36rpx 32rpx; background: #fff; border-radius: 20rpx; display: flex; flex-direction: column; align-items: flex-start; gap: 16rpx; }
.p-title { font-size: 34rpx; font-weight: 700; color: #2c2419; }
.p-desc { font-size: 26rpx; color: #6b6560; line-height: 1.5; }
.mt { margin-top: 8rpx; }
.grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 24rpx; }
.cell { width: calc((100% - 48rpx) / 4); aspect-ratio: 1; background: #fffef9; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06); }
.cell-char { font-size: 40rpx; font-weight: 600; color: #2c2419; }
</style>
