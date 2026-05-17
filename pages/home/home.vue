<template>
	<view class="page home-page tab-root-page" :style="tabPageStyle">
		<view class="hero">
			<image class="hero-bg" :src="assets.heroBg" mode="aspectFill" />
			<view class="hero-sky" />

			<view class="hero-toolbar">
				<view class="hero-circle-btn" @click="goSettings">
					<text class="hero-circle-icon">⚙️</text>
				</view>
				<view class="hero-circle-btn hero-circle-btn--vip" @click="goVip">
					<text class="hero-circle-icon">🔔</text>
					<view v-if="vipActive" class="hero-vip-dot" />
				</view>
			</view>

			<view class="hero-brand">
				<text class="hero-brand-title">萌萌识字</text>
				<text class="hero-brand-tag">和萌萌一起学汉字</text>
			</view>

			<view class="hero-mascot-wrap">
				<meng-avatar
					:pose="heroMascotPose"
					size="xl"
					custom-class="hero-mascot"
					@error="onMascotError"
				/>
			</view>

			<view class="hero-foot">
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
		</view>

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

				<view class="daily-banner" @click="goDaily">
					<image class="daily-banner-bg" :src="assets.entry.daily" mode="aspectFit" />
					<view class="daily-banner-body">
						<view class="daily-banner-text">
							<text class="daily-banner-kicker">今日推荐</text>
							<text class="daily-banner-title">每日一练</text>
							<text class="daily-banner-desc clamp-2">{{ dailyDesc }}</text>
						</view>
						<view class="daily-banner-btn">
							<text class="daily-banner-btn-text">{{ dailyBtnLabel }}</text>
						</view>
					</view>
				</view>

				<view class="cta-row">
					<view class="cta-btn cta-btn--write" @click="goWritePractice">
						<view class="cta-icon-ring">
							<image class="cta-icon-img" :src="assets.entry.strokeLab" mode="aspectFit" />
						</view>
						<view class="cta-text-col">
							<text class="cta-label">写字练习</text>
							<text class="cta-sub">笔顺田字格</text>
						</view>
					</view>
					<view class="cta-btn cta-btn--pinyin" @click="goPinyin">
						<view class="cta-icon-ring">
							<image class="cta-icon-img" :src="assets.tab.learnActive" mode="aspectFit" />
						</view>
						<view class="cta-text-col">
							<text class="cta-label">拼音学习</text>
							<text class="cta-sub">跟读与拼读</text>
						</view>
					</view>
				</view>

				<view class="quick-grid">
					<view class="quick-tile" @click="goTextbook">
						<view class="quick-icon-ring quick-icon-ring--green">
							<image class="quick-icon" :src="assets.entry.textbook" mode="aspectFit" />
						</view>
						<text class="quick-label">课本同步</text>
					</view>
					<view class="quick-tile" @click="goGame">
						<view class="quick-icon-ring quick-icon-ring--yellow">
							<image class="quick-icon" :src="assets.entry.game" mode="aspectFit" />
						</view>
						<text class="quick-label">气球营</text>
					</view>
					<view class="quick-tile" @click="goDictionary">
						<view class="quick-icon-ring quick-icon-ring--sky">
							<image class="quick-icon" :src="assets.tab.catalogActive" mode="aspectFit" />
						</view>
						<text class="quick-label">查字</text>
					</view>
					<view class="quick-tile" @click="goSettings">
						<view class="quick-icon-ring quick-icon-ring--cream">
							<image class="quick-icon" :src="assets.logoIcon" mode="aspectFit" />
						</view>
						<text class="quick-label">教材</text>
					</view>
				</view>

				<view class="dock-tip">
					<meng-avatar pose="happy" size="xs" />
					<view class="dock-tip-col">
						<text class="dock-tip-text">{{ encourageText }}</text>
						<text v-if="textbookVolumeLabel" class="dock-tip-sub">{{ textbookVolumeLabel }}</text>
					</view>
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
import { buildDailyTrainingPlan, formatDailyPlanHomeSummary } from '@/services/daily-training-service.js'
import tabMain from '@/mixins/tab-main-page.js'
import MengAvatar from '@/components/meng-avatar.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'

const HERO_POSES = ['wave', 'book', 'happy']

export default {
	components: { MengAvatar },
	mixins: [tabMain],
	data() {
		return {
			assets: MENG_ASSETS,
			summary: '',
			vipActive: false,
			encourageText: '',
			dailyDesc: '加载今日练习…',
			dailyBtnLabel: '开始练习',
			textbookVolumeLabel: '',
			mascotFallback: false,
			heroDotIndex: 0,
			heroSlides: ['跟着课本，轻松识字', '边玩边练，每天进步一点点', '和萌萌一起认字'],
			_welcomeTimer: null,
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
	computed: {
		heroMascotPose() {
			if (this.mascotFallback) return 'book'
			return HERO_POSES[this.heroDotIndex % HERO_POSES.length] || 'wave'
		}
	},
	watch: {
		heroDotIndex() {
			this.mascotFallback = false
		}
	},
	onReady() {
		this.scheduleWelcomeVoice()
	},
	onShow() {
		this.setTabBarIndex(0)
		this.refresh()
		this.scheduleWelcomeVoice()
	},
	onHide() {
		if (this._welcomeTimer != null) {
			clearTimeout(this._welcomeTimer)
			this._welcomeTimer = null
		}
		stopMengmengVoice()
	},
	methods: {
		scheduleWelcomeVoice() {
			if (this._welcomeTimer != null) {
				clearTimeout(this._welcomeTimer)
			}
			// App 首屏：等页面与音频上下文就绪后再播，避免 onShow 过早或被 onHide 打断
			this._welcomeTimer = setTimeout(() => {
				this._welcomeTimer = null
				playMengmengVoiceOnce(MENG_VOICE.GLOBAL_WELCOME, 'meng_voice_once_global_welcome_v2', {
					debounceMs: 0
				}).then((ok) => {
					if (!ok) {
						console.warn('[home] global_welcome not played')
					}
				})
			}, 520)
		},
		onMascotError() {
			this.mascotFallback = true
		},
		async refresh() {
			this.summary = getCurriculumSummary()
			this.textbookVolumeLabel = formatGradeSemesterLabel(getCurriculumPrefs())
			this.vipActive = isVipActive()
			const p = getCurriculumPrefs()
			const learned = countLearnedCharsForCurriculumPrefs(p)
			try {
				const plan = await buildDailyTrainingPlan(p)
				const summary = formatDailyPlanHomeSummary(plan, learned)
				this.dailyDesc = summary.desc
				this.dailyBtnLabel = summary.btnLabel
			} catch (e) {
				console.warn('[home] daily plan', e)
				this.dailyDesc = '今日练习加载失败，点我重试'
				this.dailyBtnLabel = '重试'
			}
			this.encourageText = buildEncourageText({ remain: 5 })
			this.heroSlides = [
				this.dailyDesc,
				this.encourageText,
				`${this.textbookVolumeLabel} · 跟着课本轻松识字`
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
			playMengmengVoice(MENG_VOICE.HOME_STROKE_LAB, { debounceMs: 200 }).catch(() => {})
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
			playMengmengVoice(MENG_VOICE.HOME_DAILY, { debounceMs: 200 }).catch(() => {})
			startDailyTraining()
		}
	}
}
</script>

<style scoped>
.home-page {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: var(--meng-page-bg);
}

.hero {
	position: relative;
	flex: 1;
	min-height: 400rpx;
	max-height: 52vh;
	overflow: hidden;
}

.hero-bg {
	position: absolute;
	inset: 0;
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
		rgba(255, 248, 240, 0.35) 0%,
		rgba(255, 252, 248, 0.08) 55%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
}

.hero-toolbar {
	position: relative;
	z-index: 4;
	display: flex;
	justify-content: space-between;
	padding: 4rpx 24rpx 0;
}

.hero-circle-btn {
	position: relative;
	width: 68rpx;
	height: 68rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.88);
	border: 1rpx solid rgba(255, 255, 255, 0.95);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 20rpx var(--meng-shadow);
}

.hero-circle-icon {
	font-size: 30rpx;
}

.hero-vip-dot {
	position: absolute;
	top: 10rpx;
	right: 10rpx;
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: var(--meng-accent-solid);
	border: 2rpx solid #fff;
}

.hero-brand {
	position: relative;
	z-index: 4;
	text-align: center;
	padding: 0 32rpx;
}

.hero-brand-title {
	display: block;
	font-size: 44rpx;
	font-weight: 800;
	color: var(--meng-chocolate);
	letter-spacing: 6rpx;
	text-shadow: 0 2rpx 0 rgba(255, 255, 255, 0.8);
}

.hero-brand-tag {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
	letter-spacing: 2rpx;
}

.hero-mascot-wrap {
	position: relative;
	z-index: 3;
	flex: 1;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	min-height: 260rpx;
	padding-bottom: 8rpx;
}

.hero-mascot {
	filter: drop-shadow(0 20rpx 36rpx rgba(92, 61, 46, 0.18));
}

.hero-foot {
	position: relative;
	z-index: 4;
	padding-bottom: 48rpx;
}

.hero-dots {
	display: flex;
	justify-content: center;
	gap: 10rpx;
}

.hero-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: rgba(92, 61, 46, 0.2);
}

.hero-dot--on {
	width: 26rpx;
	border-radius: 8rpx;
	background: var(--meng-accent-solid);
}

.hero-caption {
	display: block;
	text-align: center;
	font-size: 22rpx;
	color: var(--meng-text-secondary);
	padding: 10rpx 40rpx 0;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dock {
	position: relative;
	z-index: 5;
	flex-shrink: 0;
	margin-top: -44rpx;
}

.dock-glass {
	margin: 0 16rpx;
	padding: 24rpx 22rpx 18rpx;
	border-radius: 36rpx 36rpx 28rpx 28rpx;
	background: var(--meng-glass-bg);
	border: 2rpx solid var(--meng-glass-border);
	box-shadow: 0 -8rpx 40rpx var(--meng-shadow), 0 12rpx 36rpx var(--meng-shadow);
	/* #ifdef H5 */
	backdrop-filter: blur(24px);
	/* #endif */
}

.grade-scroll {
	width: 100%;
	margin-bottom: 20rpx;
}

.grade-row {
	display: flex;
	flex-direction: row;
	white-space: nowrap;
}

.grade-chip {
	display: inline-flex;
	padding: 10rpx 24rpx;
	margin-right: 12rpx;
	border-radius: 999rpx;
	background: var(--meng-card-solid);
	border: 2rpx solid var(--meng-border);
}

.grade-chip--on {
	background: var(--meng-chip-active-bg);
	border-color: var(--meng-chip-active-border);
	box-shadow: 0 4rpx 14rpx var(--meng-shadow-warm);
}

.grade-chip-text {
	font-size: 24rpx;
	color: var(--meng-text-muted);
	font-weight: 500;
}

.grade-chip--on .grade-chip-text {
	color: var(--meng-tab-active-text);
	font-weight: 700;
}

/* 每日一练主卡片 */
.daily-banner {
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	min-height: 152rpx;
	margin-bottom: 20rpx;
	padding: 20rpx 20rpx 20rpx 0;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #fff6ec 0%, #ffe8d4 48%, #ffd4b8 100%);
	border: 2rpx solid rgba(232, 122, 74, 0.22);
	box-shadow: 0 10rpx 28rpx var(--meng-shadow-warm);
	overflow: hidden;
}

.daily-banner-bg {
	position: absolute;
	left: -8rpx;
	bottom: -12rpx;
	width: 200rpx;
	height: 200rpx;
	opacity: 0.92;
	pointer-events: none;
}

.daily-banner-body {
	position: relative;
	z-index: 1;
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding-left: 168rpx;
	min-width: 0;
}

.daily-banner-text {
	flex: 1;
	min-width: 0;
}

.daily-banner-kicker {
	display: block;
	font-size: 20rpx;
	font-weight: 700;
	color: var(--meng-accent-solid);
	letter-spacing: 2rpx;
}

.daily-banner-title {
	display: block;
	font-size: 34rpx;
	font-weight: 800;
	color: var(--meng-chocolate);
	margin-top: 4rpx;
}

.daily-banner-desc {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: var(--meng-text-secondary);
	line-height: 1.4;
}

.clamp-2 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.daily-banner-btn {
	flex-shrink: 0;
	padding: 14rpx 22rpx;
	border-radius: 999rpx;
	background: linear-gradient(145deg, var(--meng-accent-from), var(--meng-accent-to));
	box-shadow: 0 6rpx 16rpx var(--meng-shadow-warm);
}

.daily-banner-btn-text {
	font-size: 24rpx;
	font-weight: 800;
	color: #fff;
	white-space: nowrap;
}

.cta-row {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
	margin-bottom: 20rpx;
}

.cta-btn {
	flex: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 18rpx 16rpx;
	border-radius: 24rpx;
	box-shadow: 0 6rpx 20rpx var(--meng-shadow);
}

.cta-btn--write {
	background: linear-gradient(145deg, var(--meng-accent-from), var(--meng-accent-to));
}

.cta-btn--pinyin {
	background: linear-gradient(145deg, var(--meng-leaf-soft) 0%, #c8e8d4 100%);
	border: 1rpx solid rgba(126, 200, 160, 0.35);
}

.cta-icon-ring {
	width: 56rpx;
	height: 56rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.55);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.cta-icon-img {
	width: 40rpx;
	height: 40rpx;
}

.cta-text-col {
	flex: 1;
	min-width: 0;
}

.cta-label {
	font-size: 28rpx;
	font-weight: 800;
	color: var(--meng-chocolate);
}

.cta-btn--write .cta-label,
.cta-btn--write .cta-sub {
	color: #fff;
}

.cta-sub {
	display: block;
	margin-top: 2rpx;
	font-size: 20rpx;
	color: var(--meng-text-secondary);
	font-weight: 500;
}

.cta-btn--write .cta-sub {
	color: rgba(255, 255, 255, 0.9);
}

.quick-grid {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
	margin-bottom: 18rpx;
}

.quick-tile {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16rpx 6rpx 14rpx;
	border-radius: 22rpx;
	background: var(--meng-card-solid);
	border: 1rpx solid var(--meng-border);
	box-shadow: 0 4rpx 16rpx var(--meng-shadow);
}

.quick-icon-ring {
	width: 64rpx;
	height: 64rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 8rpx;
}

.quick-icon-ring--green {
	background: var(--meng-leaf-soft);
}

.quick-icon-ring--yellow {
	background: #fff4d8;
}

.quick-icon-ring--sky {
	background: #e8f4fc;
}

.quick-icon-ring--cream {
	background: var(--meng-banner-soft);
}

.quick-icon {
	width: 48rpx;
	height: 48rpx;
}

.quick-label {
	font-size: 22rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
}

.dock-tip {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 14rpx 16rpx;
	border-radius: 18rpx;
	background: var(--meng-tip-bg);
	border: 1rpx solid var(--meng-border-warm);
}

.dock-tip-col {
	flex: 1;
	min-width: 0;
}

.dock-tip-text {
	font-size: 24rpx;
	color: var(--meng-tip-text);
	line-height: 1.45;
}

.dock-tip-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted);
}
</style>
