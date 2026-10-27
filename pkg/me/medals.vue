<template>
	<meng-sub-page title="勋章墙" subtitle="学习越多，点亮越多">
		<view class="growth-card">
			<meng-avatar :pose="growthPose" size="sm" />
			<view class="growth-copy">
				<text class="growth-level">{{ growthLabel }}</text>
				<text class="growth-sub">{{ growthSub }}</text>
				<text v-if="growthCosmetic" class="growth-cosmetic">{{ growthCosmetic }}</text>
			</view>
			<view class="growth-stat">
				<text class="growth-stat-num">{{ unlockedCount }}</text>
				<text class="growth-stat-label">/ {{ totalCount }} 枚</text>
			</view>
		</view>

		<view v-if="nextLevelHint" class="next-hint">
			<text class="next-hint-text">{{ nextLevelHint }}</text>
		</view>

		<view class="section-head">
			<text class="section-title">全部勋章</text>
			<text class="section-desc">未解锁显示进度；图片可替换为 static/mengmeng/medals 下 AI 资源</text>
		</view>

		<view class="grid">
			<meng-medal-card
				v-for="m in medals"
				:key="m.id"
				:medal="m"
				@tap="onMedalTap"
			/>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import MengMedalCard from '@/components/meng-medal-card.vue'
import { listWrongOftenChars } from '@/utils/user-progress-storage.js'
import { syncWrongReviewState } from '@/utils/achievement-stats-storage.js'
import {
	listMedalsWithState,
	getCurrentGrowthLevel,
	formatGrowthLevelLabel,
	countUnlockedMedals
} from '@/services/medal-service.js'
import { MEDAL_LIST } from '@/data/medals.js'

export default {
	components: { MengSubPage, MengAvatar, MengMedalCard },
	data() {
		return {
			medals: [],
			growthLabel: '',
			growthSub: '',
			growthCosmetic: '',
			growthPose: 'wave',
			nextLevelHint: '',
			unlockedCount: 0,
			totalCount: MEDAL_LIST.length
		}
	},
	onShow() {
		syncWrongReviewState(listWrongOftenChars().length)

		const { current, next, snapshot } = getCurrentGrowthLevel()
		this.growthLabel = formatGrowthLevelLabel(current)
		this.growthSub = current.summary || ''
		this.growthCosmetic = current.cosmetic || ''
		this.growthPose = current.level >= 5 ? 'happy' : current.level >= 2 ? 'book' : 'wave'

		if (next && next.require) {
			const parts = []
			if (next.require.learnedTotal != null) {
				parts.push(`已学 ${snapshot.learnedTotal}/${next.require.learnedTotal} 字`)
			}
			if (next.require.strokePractice != null) {
				parts.push(`写字 ${snapshot.strokePractice}/${next.require.strokePractice} 次`)
			}
			if (next.require.lessonQuizPassed != null) {
				parts.push(`小测验通关 ${snapshot.lessonQuizPassed}/${next.require.lessonQuizPassed} 站`)
			}
			if (next.require.dailyStreak != null) {
				parts.push(`连续打卡 ${snapshot.dailyStreak}/${next.require.dailyStreak} 天`)
			}
			this.nextLevelHint = `下一级「${next.name}」：${parts.join(' · ')}`
		} else {
			this.nextLevelHint = '已达最高成长等级，继续保持！'
		}

		this.medals = listMedalsWithState()
		this.unlockedCount = countUnlockedMedals()
	},
	methods: {
		onMedalTap(m) {
			if (!m) return
			const title = m.unlocked ? m.name : `${m.name}（未解锁）`
			const content = m.unlocked
				? `主题：${m.theme || '—'}\n${m.rule}`
				: `${m.rule}${m.progress ? `\n进度：${m.progress.current}/${m.progress.target}` : ''}`
			uni.showModal({
				title,
				content,
				showCancel: false,
				confirmText: '知道了'
			})
		}
	}
}
</script>

<style scoped>
.growth-card {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 24rpx;
	margin-bottom: 20rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #fff8e8 0%, #f0f7ea 100%);
	border: 1rpx solid #e8dfc8;
}

.growth-copy {
	flex: 1;
	min-width: 0;
	margin-left: 16rpx;
}

.growth-level {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.growth-sub {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	margin-top: 6rpx;
}

.growth-cosmetic {
	display: block;
	font-size: 22rpx;
	color: #3d6b4a;
	margin-top: 4rpx;
}

.growth-stat {
	text-align: right;
	flex-shrink: 0;
}

.growth-stat-num {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #b8860b;
	line-height: 1.1;
}

.growth-stat-label {
	font-size: 22rpx;
	color: #8a8279;
}

.next-hint {
	padding: 16rpx 20rpx;
	margin-bottom: 20rpx;
	border-radius: 14rpx;
	background: rgba(255, 255, 255, 0.75);
	border: 1rpx dashed #d9d0c0;
}

.next-hint-text {
	font-size: 23rpx;
	color: #5a534c;
	line-height: 1.5;
}

.section-head {
	margin-bottom: 16rpx;
}

.section-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.section-desc {
	display: block;
	font-size: 22rpx;
	color: #a8a29e;
	margin-top: 6rpx;
}

.grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
</style>
