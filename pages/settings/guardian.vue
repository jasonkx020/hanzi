<!--
  @file guardian.vue
  @layer L1 表现层
  @description 路由页面源文件：guardian.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="家长管理" subtitle="朗读人、缓存与护眼设置">
		<view class="card">
			<text class="title">家长管理</text>
			<text class="desc">学习时长、提醒时间、护眼与家长验证配置。</text>
		</view>
		<view class="card">
			<text class="field-label">朗读人</text>
			<view class="switch-row">
				<view class="chip" :class="narrator === 'kid' ? 'chip-on' : ''" @click="pick('kid')">童声</view>
				<view class="chip" :class="narrator === 'female' ? 'chip-on' : ''" @click="pick('female')">标准女声</view>
			</view>
			<text class="tip">当前：{{ narratorText }}</text>
		</view>
		<view class="card">
			<text class="field-label">查字缓存</text>
			<text class="tip">已缓存 {{ cacheCount }} 条（缓存有效期 7 天）</text>
			<button size="mini" type="warn" @click="clearDictCache">清空查字缓存</button>
		</view>
	</meng-sub-page>
</template>
<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { getAudioNarrator, setAudioNarrator, getAudioNarratorLabel } from '@/utils/audio-settings.js'
import { clearDictionaryCache, getDictionaryCacheStats } from '@/utils/dictionary-cache.js'

export default {
	components: { MengSubPage },
	data() {
		return {
			narrator: 'kid',
			cacheCount: 0
		}
	},
	computed: {
		narratorText() {
			return getAudioNarratorLabel(this.narrator)
		}
	},
	onShow() {
		this.narrator = getAudioNarrator()
		this.cacheCount = getDictionaryCacheStats().count
	},
	methods: {
		pick(v) {
			this.narrator = setAudioNarrator(v)
			uni.showToast({ title: `已切换为${this.narratorText}`, icon: 'none' })
		},
		clearDictCache() {
			clearDictionaryCache()
			this.cacheCount = 0
			uni.showToast({ title: '查字缓存已清空', icon: 'none' })
		}
	}
}
</script>
<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: var(--meng-page-bg); }
.card { background: #fff; border-radius: 14rpx; padding: 24rpx; margin-bottom: 14rpx; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: var(--meng-text); margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
.field-label { display: block; font-size: 27rpx; color: var(--meng-text); font-weight: 600; margin-bottom: 10rpx; }
.switch-row { display: flex; flex-direction: row; }
.switch-row > .chip + .chip { margin-left: 10rpx; }
.chip { padding: 12rpx 18rpx; border-radius: 999rpx; background: #f1ece2; font-size: 24rpx; color: #6b6560; }
.chip-on { background: var(--meng-chip-active-bg); color: var(--meng-text); font-weight: 700; }
.tip { display: block; margin-top: 10rpx; font-size: 22rpx; color: #8a8279; }
</style>
