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
				<text class="entry-title">📘 课本同步学</text>
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
				<text class="entry-desc">今天已学8个字，再练2个得勋章</text>
				<button class="entry-btn" size="mini" @click="goDaily">继续练习</button>
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
import { getCurriculumPrefs, setCurriculumPrefs } from '@/utils/curriculum-storage.js'
import tabMain from '@/mixins/tab-main-page.js'

export default {
	mixins: [tabMain],
	data() {
		return {
			summary: '',
			vipActive: false,
			encourageText: '',
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
		refresh() {
			this.summary = getCurriculumSummary()
			this.vipActive = isVipActive()
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

.entry-title {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: #2c2419;
	margin-bottom: 6rpx;
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
