<template>
	<meng-sub-page :title="t('wrong.title')" :subtitle="t('wrong.subtitle')">
		<view v-if="rows.length === 0" class="empty">
			<text class="empty-title">{{ t('wrong.empty.title') }}</text>
			<text class="empty-tip">{{ t('wrong.empty.tip') }}</text>
		</view>
		<view v-else class="list-wrap">
			<view class="test-entry" @click="startWrongQuiz">
				<view class="test-entry-main">
					<text class="test-entry-title">测一测易错字</text>
					<text class="test-entry-desc">听音认字 · 看字选音，测对即移出</text>
				</view>
				<text class="test-entry-go">开始 ›</text>
			</view>
			<view class="tier-legend">
				<text class="tier-legend-item tier-legend--mild">1–2 次</text>
				<text class="tier-legend-item tier-legend--warm">3–4 次</text>
				<text class="tier-legend-item tier-legend--hot">≥5 次</text>
			</view>
			<view v-if="vipUpsell" class="vip-upsell" @click="goVip">
				<text class="vip-upsell-text">{{ vipUpsell }}</text>
				<text class="vip-upsell-link">{{ t('wrong.vip.link') }}</text>
			</view>
			<view
				v-for="(r, i) in visibleRows"
				:key="i"
				class="row"
				:class="'row--' + wrongTier(r[COL_PROGRESS.wrong_count])"
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
import {
	listWrongOftenChars,
	listLearnedChars
} from '@/utils/user-progress-storage.js'
import { syncWrongReviewState } from '@/utils/achievement-stats-storage.js'
import { FREE_WRONG_OFTEN_VISIBLE } from '@/constants/vip-quota-limits.js'
import { isVipActive } from '@/utils/vip.js'
import i18nPage from '@/mixins/i18n-page.js'
import { putLessonQuizTransfer } from '@/utils/lesson-mode-session.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { firstHanzi, orderedUniqueRows } from '@/utils/lesson-quiz-plan.js'

function progressRowToQuizRow(r) {
	const h = firstHanzi(r && r[COL_PROGRESS.hanzi])
	if (!h) return null
	let pinyin = ''
	try {
		pinyin = String(spellDisplayString(h, 'poly', 'tone', 'array', 'low') || '').trim()
	} catch (_) {
		pinyin = ''
	}
	return { hanzi: h, pinyin }
}

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
		wrongTier(count) {
			const n = Number(count) || 0
			if (n >= 5) return 'hot'
			if (n >= 3) return 'warm'
			return 'mild'
		},
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
		},
		startWrongQuiz() {
			const targets = orderedUniqueRows(
				this.visibleRows.map(progressRowToQuizRow).filter(Boolean)
			)
			if (!targets.length) {
				uni.showToast({ title: '暂无易错字可测', icon: 'none' })
				return
			}
			const learned = listLearnedChars()
				.map(progressRowToQuizRow)
				.filter(Boolean)
			const distractors = orderedUniqueRows([...targets, ...learned])
			if (distractors.length < 2) {
				uni.showToast({ title: '再积累几个字再来测吧', icon: 'none' })
				return
			}
			putLessonQuizTransfer({
				lessonTitle: '易错字小测',
				rjLessonIdx: null,
				reviewMode: 'wrong_often',
				rows: targets,
				distractorRows: distractors
			})
			uni.navigateTo({ url: '/pages/literacy/lesson-quiz' })
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

.test-entry {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 24rpx;
	background: linear-gradient(135deg, #fff3e0 0%, #ffe0ec 100%);
	border-bottom: 1rpx solid rgba(255, 160, 120, 0.35);
}

.test-entry:active {
	opacity: 0.9;
}

.test-entry-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.test-entry-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #c62828;
}

.test-entry-desc {
	font-size: 22rpx;
	color: #8d6e63;
}

.test-entry-go {
	flex-shrink: 0;
	margin-left: 16rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #e64a19;
}

.tier-legend {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 14rpx 20rpx;
	border-bottom: 1rpx solid #eee;
	background: #fffdf8;
}

.tier-legend-item {
	font-size: 20rpx;
	font-weight: 700;
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
}

.tier-legend--mild {
	color: #ef6c00;
	background: #fff3e0;
}

.tier-legend--warm {
	color: #e65100;
	background: #ffe0b2;
}

.tier-legend--hot {
	color: #fff;
	background: #e53935;
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
	border-left: 8rpx solid transparent;
	box-sizing: border-box;
}

.row > * + * {
	margin-left: 20rpx;
}

.row:last-child {
	border-bottom: none;
}

.row--mild {
	background: #fff8f0;
	border-left-color: #ffb74d;
}

.row--warm {
	background: #fff0e6;
	border-left-color: #ff7043;
}

.row--hot {
	background: #ffebee;
	border-left-color: #e53935;
}

.char {
	font-size: 40rpx;
	font-weight: 600;
	color: var(--meng-text);
	min-width: 72rpx;
}

.row--hot .char {
	color: #b71c1c;
	font-weight: 800;
}

.row--warm .char {
	color: #bf360c;
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
	font-weight: 600;
}

.badge--mild {
	color: #ef6c00;
}

.badge--warm {
	color: #e65100;
}

.badge--hot {
	color: #c62828;
	font-weight: 800;
}

.arrow {
	font-size: 32rpx;
	color: #c4bcb4;
}
</style>
