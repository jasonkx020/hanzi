<template>
	<meng-sub-page title="我学过的字库" subtitle="在生字详情中标记「已学」的字">
		<view v-if="rows.length === 0" class="empty">
			<text class="empty-title">暂无记录</text>
			<text class="empty-tip">在生字详情中「标记已学过」后，会出现在这里；进度保存在本机存储。</text>
		</view>
		<view v-else>
			<view class="export-bar">
				<text class="export-hint">共 {{ rows.length }} 字 · 会员可导出清单</text>
				<view class="export-btn" @click="onExportList">
					<text class="export-btn-text">导出生字</text>
				</view>
			</view>
			<view class="grid">
			<view
				v-for="(r, i) in rows"
				:key="i"
				class="cell"
				@click="openDetail(r)"
			>
				<text class="char">{{ r[COL_PROGRESS.hanzi] }}</text>
			</view>
		</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { speakHanzi } from '@/utils/speak-hanzi.js'
import { listLearnedChars } from '@/utils/user-progress-storage.js'
import { gateAndPrompt, VIP_FEATURE } from '@/utils/vip-gate.js'

export default {
	components: { MengSubPage },
	data() {
		return {
			COL_PROGRESS,
			rows: []
		}
	},
	onShow() {
		this.rows = listLearnedChars()
	},
	methods: {
		async onExportList() {
			const g = await gateAndPrompt(VIP_FEATURE.EXPORT_LIST)
			if (!g.ok) return
			const lines = this.rows.map((r) => r[COL_PROGRESS.hanzi]).filter(Boolean)
			if (!lines.length) {
				uni.showToast({ title: '暂无字可导出', icon: 'none' })
				return
			}
			const text = `萌萌识字 · 已学生字（${lines.length}）\n\n${lines.join('、')}`
			// #ifdef MP-WEIXIN
			uni.setClipboardData({
				data: text,
				success: () => uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
			})
			// #endif
			// #ifndef MP-WEIXIN
			uni.setClipboardData({
				data: text,
				success: () => uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
			})
			// #endif
		},
		openDetail(r) {
			speakHanzi(r[COL_PROGRESS.hanzi] || '')
			const h = encodeURIComponent(r[COL_PROGRESS.hanzi] || '')
			const g = r[COL_PROGRESS.grade] ?? ''
			const s = encodeURIComponent(r[COL_PROGRESS.semester] || '')
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${h}&grade=${g}&semester=${s}`
			})
		}
	}
}
</script>

<style scoped>
.page {
	box-sizing: border-box;
}

.empty {
	padding: 48rpx 24rpx;
	background: #fffef9;
	border-radius: 16rpx;
}

.empty-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: var(--meng-text);
	margin-bottom: 16rpx;
}

.empty-tip {
	display: block;
	font-size: 24rpx;
	color: #8a8279;
	line-height: 1.55;
}

.export-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
	padding: 16rpx 18rpx;
	border-radius: 16rpx;
	background: var(--meng-card-solid);
	border: 1rpx solid var(--meng-border);
}

.export-hint {
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	flex: 1;
	min-width: 0;
}

.export-btn {
	flex-shrink: 0;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	background: var(--meng-accent-solid);
}

.export-btn-text {
	font-size: 24rpx;
	font-weight: 700;
	color: #fff;
}

.grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}

.cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 16rpx;
	min-height: 88rpx;
	background: #fffef9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06);
}

.cell:nth-child(4n) {
	margin-right: 0;
}

.char {
	font-size: 44rpx;
	font-weight: 600;
	color: var(--meng-text);
}
</style>
