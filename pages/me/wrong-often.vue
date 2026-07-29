<template>
	<meng-sub-page :title="t('wrong.title')" :subtitle="t('wrong.subtitle')">
		<view v-if="rows.length === 0" class="empty">
			<text class="empty-title">{{ t('wrong.empty.title') }}</text>
			<text class="empty-tip">{{ t('wrong.empty.tip') }}</text>
		</view>
		<view v-else class="list-wrap">
			<view v-if="vipUpsell" class="vip-upsell" @click="goVip">
				<text class="vip-upsell-text">{{ vipUpsell }}</text>
				<text class="vip-upsell-link">{{ t('wrong.vip.link') }}</text>
			</view>
			<view
				v-for="(r, i) in visibleRows"
				:key="i"
				class="row"
				@click="openDetail(r)"
			>
				<text class="char">{{ r[COL_PROGRESS.hanzi] }}</text>
				<view class="meta">
					<text class="dim">{{ formatGradeSemesterLabel({ grade: r[COL_PROGRESS.grade], semester: r[COL_PROGRESS.semester] }) }}</text>
					<text class="badge">{{ t('wrong.badge', { n: r[COL_PROGRESS.wrong_count] }) }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { COL_PROGRESS } from '@/constants/curriculum-schema.js'
import { formatGradeSemesterLabel } from '@/utils/curriculum-storage.js'
import { speakHanzi } from '@/utils/speak-hanzi.js'
import { listWrongOftenChars } from '@/utils/user-progress-storage.js'
import { syncWrongReviewState } from '@/utils/achievement-stats-storage.js'
import { FREE_WRONG_OFTEN_VISIBLE } from '@/constants/vip-quota-limits.js'
import { isVipActive } from '@/utils/vip.js'
import i18nPage from '@/mixins/i18n-page.js'

export default {
	mixins: [i18nPage],
	components: { MengSubPage },
	data() {
		return {
			COL_PROGRESS,
			rows: []
		}
	},
	computed: {
		visibleRows() {
			if (isVipActive()) return this.rows
			return this.rows.slice(0, FREE_WRONG_OFTEN_VISIBLE)
		},
		vipUpsell() {
			if (isVipActive() || this.rows.length <= FREE_WRONG_OFTEN_VISIBLE) return ''
			return this.t('wrong.vip.upsell', {
				limit: FREE_WRONG_OFTEN_VISIBLE,
				total: this.rows.length
			})
		}
	},
	onShow() {
		this.rows = listWrongOftenChars()
		syncWrongReviewState(this.rows.length)
	},
	methods: {
		formatGradeSemesterLabel,
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
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

.list-wrap {
	background: #fffef9;
	border-radius: 16rpx;
	overflow: hidden;
}

.vip-upsell {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 20rpx;
	background: var(--meng-leaf-soft);
	border-bottom: 1rpx solid var(--meng-border);
}

.vip-upsell-text {
	flex: 1;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
}

.vip-upsell-link {
	font-size: 24rpx;
	font-weight: 700;
	color: var(--meng-accent-solid);
}

.row {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 24rpx;
	border-bottom: 1rpx solid #eee;
}

.row > * + * {
	margin-left: 20rpx;
}

.row:last-child {
	border-bottom: none;
}

.char {
	font-size: 40rpx;
	font-weight: 600;
	color: var(--meng-text);
	min-width: 72rpx;
}

.meta {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.meta > * + * {
	margin-top: 6rpx;
}

.dim {
	font-size: 22rpx;
	color: #8a8279;
}

.badge {
	font-size: 24rpx;
	color: #9a3412;
	font-weight: 500;
}

.arrow {
	font-size: 32rpx;
	color: #c4bcb4;
}
</style>
