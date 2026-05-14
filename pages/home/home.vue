<template>
	<view class="page tab-root-page" :style="tabPageStyle">
		<view class="top-row">
			<text class="top-title">萌萌识字</text>
			<view class="top-actions">
				<text class="top-icon" @click="goVip">🔔</text>
				<text class="top-icon" @click="goSettings">⚙️</text>
			</view>
		</view>

		<view class="recommend-card">
			<text class="recommend-text">🌟 今日推荐：学完3课得勋章</text>
		</view>

		<view class="curriculum-tabs">
			<view
				v-for="item in curriculumTabs"
				:key="item.key"
				class="tab-chip"
				:class="{ 'tab-chip-active': isCurrentTab(item) }"
				@click="pickCurriculum(item)"
			>
				<text class="tab-chip-text">{{ item.label }}</text>
			</view>
		</view>

		<view class="entry-list">
			<view class="entry-card">
				<view class="entry-title-row">
					<text class="entry-title">📘 课本同步学</text>
					<text class="entry-volume">{{ textbookVolumeLabel }}</text>
				</view>
				<text class="entry-desc">跟着课本学生字</text>
				<button class="entry-btn" size="mini" @click="goTextbook">立即学习</button>
			</view>
			<view class="entry-card">
				<text class="entry-title">🎈 趣味识字营</text>
				<text class="entry-desc">边玩边记，闯关拿星</text>
				<button class="entry-btn" size="mini" @click="goGame">开始闯关</button>
			</view>
			<view class="entry-card">
				<text class="entry-title">⭐ 每日一练</text>
				<text class="entry-desc">{{ dailyDesc }}</text>
				<button class="entry-btn" size="mini" @click="goDaily">{{ dailyBtnLabel }}</button>
			</view>
		</view>

		<view class="tips">
			<text class="tips-text">🐼 萌萌说：{{ encourageText }}</text>
		</view>
	</view>
</template>

<script>
import { getCurriculumSummary } from '@/repositories/curriculum-repository.js'
import { buildEncourageText } from '@/services/reward-service.js'
import { isVipActive } from '@/utils/vip.js'
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'
import { startLiteracyGame } from '@/modules/literacy/usecases/start-literacy-game.js'
import { startDailyTraining } from '@/modules/literacy/usecases/start-daily-training.js'
import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, setCurriculumPrefs, formatGradeSemesterLabel } from '@/utils/curriculum-storage.js'
import { countLearnedCharsForCurriculumPrefs } from '@/utils/user-progress-storage.js'
import { buildDailyTrainingQueue, countWeakInDailyItems } from '@/services/daily-training-service.js'
import tabMain from '@/mixins/tab-main-page.js'

export default {
	mixins: [tabMain],
	data() {
		return {
			summary: '',
			vipActive: false,
			encourageText: '',
			dailyDesc: '加载今日练习…',
			dailyBtnLabel: '开始练习',
			textbookVolumeLabel: '',
			curriculumTabs: [
				{
					key: 'preschool',
					label: '幼升小',
					grade: 0,
					semester: '上',
					textbook_version_id: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300
				},
				{
					key: '1-shang',
					label: '一上',
					grade: 1,
					semester: '上',
					textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
				},
				{
					key: '1-xia',
					label: '一下',
					grade: 1,
					semester: '下',
					textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
				},
				{
					key: '2-shang',
					label: '二上',
					grade: 2,
					semester: '上',
					textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
				}
			]
		}
	},
	onShow() {
		this.setTabBarIndex(0)
		this.refresh()
	},
	methods: {
		async refresh() {
			this.summary = getCurriculumSummary()
			this.textbookVolumeLabel = formatGradeSemesterLabel(getCurriculumPrefs())
			this.vipActive = isVipActive()
			const p = getCurriculumPrefs()
			const learned = countLearnedCharsForCurriculumPrefs(p)
			try {
				const plan = await buildDailyTrainingQueue(p, { limit: 10 })
				const weakIn = countWeakInDailyItems(plan.items)
				if (!plan.poolSize) {
					this.dailyDesc = '当前字表下暂无生字，可先切换年级或去课本同步学选课。'
					this.dailyBtnLabel = '去设置'
				} else {
					this.dailyBtnLabel = '开始练习'
					const tail = weakIn ? `今日推荐含 ${weakIn} 个易错复习。` : '今日推荐已按易错优先排好。'
					this.dailyDesc = `本字表已学 ${learned} 字 · 今日练 ${plan.items.length} 字。${tail}`
				}
			} catch (e) {
				console.warn('[home] daily plan', e)
				this.dailyDesc = '今日练习加载失败，请稍后重试。'
				this.dailyBtnLabel = '重试'
			}
			this.encourageText = buildEncourageText({ remain: 5 })
		},
		isCurrentTab(item) {
			const p = getCurriculumPrefs()
			const tv = item.textbook_version_id
			const tvOk = tv == null || p.textbook_version_id === tv
			return tvOk && Number(p.grade) === Number(item.grade) && p.semester === item.semester
		},
		pickCurriculum(item) {
			const patch = { grade: item.grade, semester: item.semester }
			if (item.textbook_version_id) patch.textbook_version_id = item.textbook_version_id
			setCurriculumPrefs(patch)
			this.refresh()
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goTextbook() {
			startTextbookLearning()
		},
		goGame() {
			startLiteracyGame()
		},
		goDaily() {
			if (this.dailyBtnLabel === '去设置') {
				uni.navigateTo({ url: '/pages/settings/curriculum' })
				return
			}
			startDailyTraining()
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	background: #f4f1ea;
	box-sizing: border-box;
}

.top-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 18rpx;
}

.top-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #2c2419;
}

.top-actions {
	display: flex;
	align-items: center;
}

.top-icon {
	font-size: 34rpx;
	margin-left: 18rpx;
}

.recommend-card {
	background: #fff6df;
	border-radius: 16rpx;
	padding: 18rpx 20rpx;
	margin-bottom: 14rpx;
}

.recommend-text {
	font-size: 24rpx;
	color: #7a5f2a;
}

.curriculum-tabs {
	display: flex;
	flex-wrap: wrap;
	margin-bottom: 18rpx;
	gap: 10rpx;
}

.tab-chip {
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: #fff;
	border: 1rpx solid #e3d9c8;
}

.tab-chip-active {
	background: #ffe9bf;
	border-color: #ffb74d;
}

.tab-chip-text {
	font-size: 22rpx;
	color: #6d5a41;
}

.entry-list {
	display: flex;
	flex-direction: column;
	margin-bottom: 24rpx;
}

.entry-list > .entry-card + .entry-card {
	margin-top: 18rpx;
}

.entry-card {
	padding: 22rpx;
	background: #fff;
	border-radius: 20rpx;
	box-shadow: 0 6rpx 20rpx rgba(44, 36, 25, 0.07);
}

.entry-title-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12rpx;
	margin-bottom: 6rpx;
}

.entry-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: #2c2419;
	margin-bottom: 6rpx;
}

.entry-title-row .entry-title {
	margin-bottom: 0;
	flex: 1;
	min-width: 0;
}

.entry-volume {
	flex-shrink: 0;
	max-width: 52%;
	font-size: 22rpx;
	color: #7a746e;
	text-align: right;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.entry-desc {
	display: block;
	font-size: 24rpx;
	color: #7a746e;
	line-height: 1.5;
	margin-bottom: 12rpx;
}

.entry-btn {
	background: #ffb74d !important;
	color: #fff !important;
	border-radius: 999rpx !important;
	font-size: 24rpx !important;
	padding: 0 18rpx !important;
}

.tips {
	background: #fff4de;
	border-radius: 14rpx;
	padding: 16rpx 18rpx;
}

.tips-text {
	font-size: 24rpx;
	color: #7a5f2a;
}
</style>
