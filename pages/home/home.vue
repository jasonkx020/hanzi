<template>
	<view class="page home-page tab-root-page" :style="tabPageStyle">
		<!-- 顶部插画区 -->
		<view class="hero">
			<image class="hero-bg" src="/static/db.png" mode="aspectFill" />
			<view class="hero-sky" />
			<view class="hero-float hero-float--l" />
			<view class="hero-float hero-float--r" />

			<view class="hero-toolbar">
				<view class="hero-circle-btn" @click="goSettings">
					<text class="hero-circle-icon">⚙️</text>
				</view>
				<view class="hero-circle-btn" @click="goVip">
					<text class="hero-circle-icon">🔔</text>
				</view>
			</view>

			<view class="hero-brand">
				<text class="hero-brand-title">萌萌识字</text>
			</view>

			<view class="hero-mascot-wrap">
				<image
					v-if="!mascotFallback"
					class="hero-mascot"
					src="/static/images/yuwen_youxiao.jpg"
					mode="aspectFit"
					@error="mascotFallback = true"
				/>
				<text v-else class="hero-mascot-fallback">🐰</text>
			</view>

			<view class="hero-dots">
				<view
					v-for="(slide, i) in heroSlides"
					:key="i"
					class="hero-dot"
					:class="{ 'hero-dot--on': heroDotIndex === i }"
					@click="heroDotIndex = i"
				/>
			</view>
			<text class="hero-caption">{{ heroSlides[heroDotIndex] }}</text>
		</view>

		<!-- 底部玻璃操作区 -->
		<view class="dock">
			<view class="dock-glass">
				<scroll-view scroll-x class="grade-scroll" :show-scrollbar="false">
					<view class="grade-row">
						<view
							v-for="item in curriculumTabs"
							:key="item.key"
							class="grade-chip"
							:class="{ 'grade-chip--on': isCurrentTab(item) }"
							@click="pickCurriculum(item)"
						>
							<text class="grade-chip-text">{{ item.label }}</text>
						</view>
					</view>
				</scroll-view>

				<view class="cta-row">
					<view class="cta-btn cta-btn--write" @click="goWritePractice">
						<view class="cta-icon-wrap cta-icon-wrap--write">
							<text class="cta-emoji">✏️</text>
						</view>
						<view class="cta-text-col">
							<text class="cta-label">写字练习</text>
							<text class="cta-sub">按笔顺在田字格写</text>
						</view>
					</view>
					<view class="cta-btn cta-btn--pinyin" @click="goPinyin">
						<view class="cta-icon-wrap cta-icon-wrap--pinyin">
							<text class="cta-emoji">📖</text>
						</view>
						<view class="cta-text-col">
							<text class="cta-label">拼音学习</text>
							<text class="cta-sub">学拼音与拼读</text>
						</view>
					</view>
				</view>

				<view class="quick-grid">
					<view class="quick-tile quick-tile--green" @click="goTextbook">
						<text class="quick-emoji">📘</text>
						<text class="quick-label">课本同步</text>
					</view>
					<view class="quick-tile quick-tile--yellow" @click="goGame">
						<text class="quick-emoji">🎈</text>
						<text class="quick-label">趣味闯关</text>
					</view>
					<view class="quick-tile quick-tile--blue" @click="goDaily">
						<text class="quick-emoji">⭐</text>
						<text class="quick-label">每日一练</text>
					</view>
					<view class="quick-tile quick-tile--lavender" @click="goDictionary">
						<text class="quick-emoji">🔍</text>
						<text class="quick-label">查字</text>
					</view>
				</view>

				<view class="dock-tip">
					<text class="dock-tip-text">🐼 {{ encourageText }}</text>
					<text v-if="textbookVolumeLabel" class="dock-tip-sub">{{ textbookVolumeLabel }} · {{ dailyDesc }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getCurriculumSummary } from '@/repositories/curriculum-repository.js'
import { buildEncourageText } from '@/services/reward-service.js'
import { isVipActive } from '@/utils/vip.js'
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'
import { startWritePractice } from '@/modules/literacy/usecases/start-write-practice.js'
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
			mascotFallback: false,
			heroDotIndex: 0,
			heroSlides: ['🌟 今日推荐：学完3课得勋章', '跟着课本，轻松识字', '边玩边练，每天进步一点点'],
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
					this.dailyDesc = '暂无生字，可切换年级或去课本选课'
					this.dailyBtnLabel = '去设置'
				} else {
					this.dailyBtnLabel = '开始练习'
					const tail = weakIn ? `含 ${weakIn} 个易错复习` : '已按易错优先排好'
					this.dailyDesc = `已学 ${learned} 字 · 今日 ${plan.items.length} 字 · ${tail}`
				}
			} catch (e) {
				console.warn('[home] daily plan', e)
				this.dailyDesc = '今日练习加载失败'
				this.dailyBtnLabel = '重试'
			}
			this.encourageText = buildEncourageText({ remain: 5 })
			this.heroSlides = [
				'🌟 今日推荐：学完3课得勋章',
				this.dailyDesc,
				`🐼 ${this.encourageText}`
			]
			this.heroDotIndex = 0
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
		goPinyin() {
			uni.switchTab({ url: '/pages/pinyin/index' })
		},
		goDictionary() {
			uni.switchTab({ url: '/pages/dictionary/index' })
		},
		goWritePractice() {
			startWritePractice()
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
.home-page {
	min-height: 100vh;
	padding-left: 0;
	padding-right: 0;
	display: flex;
	flex-direction: column;
	background: linear-gradient(180deg, #ffe8f2 0%, #fff6fa 38%, #f6f3ec 100%);
}

/* —— Hero —— */
.hero {
	position: relative;
	flex: 1;
	min-height: 380rpx;
	max-height: 56vh;
	overflow: hidden;
}

.hero-bg {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
}

.hero-sky {
	position: absolute;
	inset: 0;
	z-index: 1;
	background: linear-gradient(
		180deg,
		rgba(255, 220, 235, 0.35) 0%,
		rgba(255, 245, 250, 0.12) 55%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
}

.hero-float {
	position: absolute;
	z-index: 2;
	border-radius: 50%;
	opacity: 0.55;
	pointer-events: none;
}

.hero-float--l {
	width: 120rpx;
	height: 72rpx;
	left: 8%;
	top: 28%;
	background: rgba(255, 255, 255, 0.75);
	filter: blur(2px);
}

.hero-float--r {
	width: 96rpx;
	height: 56rpx;
	right: 12%;
	top: 22%;
	background: rgba(255, 210, 230, 0.8);
}

.hero-toolbar {
	position: relative;
	z-index: 4;
	display: flex;
	justify-content: space-between;
	padding: 8rpx 28rpx 0;
}

.hero-circle-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.92);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(255, 120, 160, 0.22);
}

.hero-circle-icon {
	font-size: 32rpx;
}

.hero-brand {
	position: relative;
	z-index: 4;
	text-align: center;
	margin-top: 4rpx;
}

.hero-brand-title {
	font-size: 40rpx;
	font-weight: 800;
	color: #fff;
	text-shadow: 0 4rpx 16rpx rgba(200, 80, 120, 0.45);
	letter-spacing: 4rpx;
}

.hero-mascot-wrap {
	position: relative;
	z-index: 3;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 240rpx;
	margin-top: -8rpx;
}

.hero-mascot {
	width: 320rpx;
	height: 320rpx;
	filter: drop-shadow(0 16rpx 32rpx rgba(255, 130, 170, 0.35));
}

.hero-mascot-fallback {
	font-size: 160rpx;
	line-height: 1;
	filter: drop-shadow(0 12rpx 24rpx rgba(255, 130, 170, 0.3));
}

.hero-dots {
	position: relative;
	z-index: 4;
	display: flex;
	justify-content: center;
	gap: 12rpx;
	margin-top: 8rpx;
}

.hero-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.45);
}

.hero-dot--on {
	width: 28rpx;
	border-radius: 8rpx;
	background: #fff;
	box-shadow: 0 2rpx 8rpx rgba(255, 100, 140, 0.35);
}

.hero-caption {
	position: relative;
	z-index: 4;
	display: block;
	text-align: center;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.95);
	padding: 10rpx 48rpx 20rpx;
	text-shadow: 0 2rpx 8rpx rgba(160, 60, 90, 0.35);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* —— 底部玻璃面板 —— */
.dock {
	position: relative;
	z-index: 5;
	flex-shrink: 0;
	margin-top: -36rpx;
}

.dock-glass {
	margin: 0 20rpx;
	padding: 28rpx 24rpx 20rpx;
	border-radius: 40rpx 40rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.88);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 -12rpx 48rpx rgba(255, 150, 180, 0.12),
		0 16rpx 40rpx rgba(44, 36, 25, 0.06);
	/* #ifdef H5 */
	backdrop-filter: blur(24px);
	/* #endif */
}

.grade-scroll {
	width: 100%;
	margin-bottom: 22rpx;
}

.grade-row {
	display: flex;
	flex-direction: row;
	white-space: nowrap;
	padding: 4rpx 0;
}

.grade-chip {
	display: inline-flex;
	padding: 12rpx 26rpx;
	margin-right: 14rpx;
	border-radius: 999rpx;
	background: rgba(255, 240, 248, 0.9);
	border: 2rpx solid rgba(255, 180, 200, 0.25);
}

.grade-chip--on {
	background: linear-gradient(135deg, #ffe0ec 0%, #ffd4f0 100%);
	border-color: rgba(255, 120, 160, 0.45);
	box-shadow: 0 6rpx 16rpx rgba(255, 120, 160, 0.2);
}

.grade-chip-text {
	font-size: 24rpx;
	color: #8a6a78;
	font-weight: 500;
}

.grade-chip--on .grade-chip-text {
	color: #c44d6a;
	font-weight: 700;
}

.cta-row {
	display: flex;
	flex-direction: row;
	gap: 20rpx;
	margin-bottom: 24rpx;
}

.cta-btn {
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
	height: 100rpx;
	border-radius: 999rpx;
	box-shadow:
		0 10rpx 28rpx rgba(255, 120, 80, 0.28),
		inset 0 2rpx 0 rgba(255, 255, 255, 0.35);
}

.cta-btn--write {
	background: linear-gradient(145deg, #ffc85a 0%, #ff9a3d 48%, #ff7b4a 100%);
}

.cta-btn--pinyin {
	background: linear-gradient(145deg, #ffb3c8 0%, #ff8aab 50%, #ff6b9d 100%);
	box-shadow: 0 10rpx 28rpx rgba(255, 100, 150, 0.32);
}

.cta-icon-wrap {
	width: 52rpx;
	height: 52rpx;
	border-radius: 16rpx;
	background: rgba(255, 255, 255, 0.28);
	display: flex;
	align-items: center;
	justify-content: center;
}

.cta-emoji {
	font-size: 30rpx;
}

.cta-text-col {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2rpx;
}

.cta-label {
	font-size: 30rpx;
	font-weight: 800;
	color: #fff;
	letter-spacing: 1rpx;
	text-shadow: 0 2rpx 6rpx rgba(180, 60, 40, 0.2);
}

.cta-sub {
	font-size: 20rpx;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.88);
	text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.12);
}

.quick-grid {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 20rpx;
}

.quick-tile {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20rpx 8rpx 18rpx;
	border-radius: 28rpx;
	box-shadow:
		0 8rpx 20rpx rgba(44, 36, 25, 0.08),
		inset 0 2rpx 0 rgba(255, 255, 255, 0.5);
}

.quick-tile--green {
	background: linear-gradient(160deg, #b8e8c8 0%, #7fd49a 100%);
}

.quick-tile--yellow {
	background: linear-gradient(160deg, #ffe9a8 0%, #ffd060 100%);
}

.quick-tile--blue {
	background: linear-gradient(160deg, #b8dcff 0%, #7eb8ff 100%);
}

.quick-tile--lavender {
	background: linear-gradient(160deg, #f0eeff 0%, #ddd8f5 100%);
}

.quick-emoji {
	font-size: 40rpx;
	margin-bottom: 8rpx;
}

.quick-label {
	font-size: 22rpx;
	font-weight: 700;
	color: rgba(44, 36, 25, 0.75);
}

.quick-tile--green .quick-label,
.quick-tile--yellow .quick-label,
.quick-tile--blue .quick-label {
	color: rgba(255, 255, 255, 0.95);
	text-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.12);
}

.dock-tip {
	padding: 16rpx 18rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #fff8f0 0%, #fff0f5 100%);
	border: 1rpx solid rgba(255, 200, 180, 0.35);
}

.dock-tip-text {
	display: block;
	font-size: 24rpx;
	color: #7a5f2a;
	line-height: 1.45;
}

.dock-tip-sub {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #9c8a7a;
	line-height: 1.4;
}
</style>
