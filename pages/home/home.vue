<template>
	<view class="page tab-page-shell home-page tab-root-page" :style="tabPageStyle">
		<meng-tab-hero
			:status-bar-px="statusBarHeight"
			:title="t('home.brand')"
			:banner-slides="heroBannerSlides"
			:banner-index="heroDotIndex"
			@avatar-error="onMascotError"
		>
			<template #actions>
				<view class="tab-hero-btn" @click="goSettings">
					<text class="tab-hero-btn-icon">⚙️</text>
				</view>
				<view class="tab-hero-btn" @click="goVip">
					<text class="tab-hero-btn-icon">🔔</text>
					<view v-if="vipActive" class="tab-hero-btn-dot" />
				</view>
			</template>
			<template #foot>
				<view class="home-hero-dots">
					<view
						v-for="(slide, i) in heroSlides"
						:key="i"
						class="home-hero-dot"
						:class="{ 'home-hero-dot--on': heroDotIndex === i }"
						@click="onHeroDotTap(i)"
					/>
				</view>
			</template>
		</meng-tab-hero>

		<home-char-showcase ref="charShowcase" class="tab-dock-overlap" />

		<view class="home-main">
				<!-- <scroll-view scroll-x class="grade-scroll" :show-scrollbar="false">
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
				</scroll-view> -->

				<view class="daily-banner" @click="goDaily">
					<image class="daily-banner-bg" :src="assets.entry.daily" mode="aspectFit" />
					<view class="daily-banner-body">
						<view class="daily-banner-text">
							<text class="daily-banner-kicker">{{ t('home.daily.kicker') }}</text>
							<text class="daily-banner-title">{{ t('home.daily.title') }}</text>
							<text class="daily-banner-desc clamp-2">{{ dailyDesc }}</text>
						</view>
						<!-- <view class="daily-banner-btn">
							<text class="daily-banner-btn-text">{{ dailyBtnLabel }}</text>
						</view> -->
					</view>
				</view>

				<view class="cta-row cta-row--single">
					<view class="cta-btn cta-btn--pinyin" @click="goWrongOften">
						<view v-if="wrongCount > 0" class="cta-badge">
							<text class="cta-badge-text">{{ wrongCountDisplay }}</text>
						</view>
						<view class="cta-icon-ring">
							<image class="cta-icon-img" :src="assets.entry.strokeLab" mode="aspectFit" />
						</view>
						<view class="cta-text-col cta-text-col--badge">
							<text class="cta-label">{{ t('home.wrong.label') }}</text>
							<text class="cta-sub">{{ wrongEntrySub }}</text>
						</view>
					</view>
				</view>

				<view class="quick-grid">
					<view class="quick-tile" @click="goWritePractice">
						<view class="quick-icon-ring quick-icon-ring--accent">
							<image class="quick-icon" :src="assets.entry.strokeLab" mode="aspectFit" />
						</view>
						<text class="quick-label">{{ t('home.quick.write') }}</text>
					</view>
					<view class="quick-tile" @click="goGame">
						<view class="quick-icon-ring quick-icon-ring--yellow">
							<image class="quick-icon" :src="assets.entry.game" mode="aspectFit" />
						</view>
						<text class="quick-label">{{ t('home.quick.game') }}</text>
					</view>
					<view class="quick-tile" @click="goComponentMap">
						<view class="quick-icon-ring quick-icon-ring--coral">
							<text class="quick-icon-emoji">🌳</text>
						</view>
						<text class="quick-label">{{ t('home.quick.componentMap') }}</text>
					</view>
				</view>

				<meng-ad-banner placement="home_banner" :mock-title="t('home.ad.mockTitle')" />

				<view class="dock-tip">
					<meng-avatar pose="happy" size="xs" />
					<view class="dock-tip-col">
						<text class="dock-tip-text">{{ encourageText }}</text>
						<text v-if="textbookVolumeLabel" class="dock-tip-sub">{{ textbookVolumeLabel }}</text>
					</view>
				</view>
		</view>
		<!-- 原生 tabBar 启动即隐藏；各端统一挂载自定义栏，避免 custom:true 切页闪烁 -->
		<custom-tab-bar />
	</view>
</template>

<script>
import { getCurriculumSummary } from '@/repositories/curriculum-repository.js'
import { buildEncourageText } from '@/services/reward-service.js'
import { isVipActive } from '@/utils/vip.js'
import { startWritePractice } from '@/modules/literacy/usecases/start-write-practice.js'
import { startLiteracyGame } from '@/modules/literacy/usecases/start-literacy-game.js'
import { startDailyTraining } from '@/modules/literacy/usecases/start-daily-training.js'
import { getCurriculumPrefs, setCurriculumPrefs, formatGradeSemesterLabel, listHomeCurriculumTabs } from '@/utils/curriculum-storage.js'
import { countLearnedCharsForCurriculumPrefs } from '@/utils/user-progress-storage.js'
import { getWrongChars } from '@/repositories/learning-repository.js'
import { buildDailyTrainingPlan, formatDailyPlanHomeSummary } from '@/services/daily-training-service.js'
import tabMain from '@/mixins/tab-main-page.js'
import i18nPage from '@/mixins/i18n-page.js'
import MengTabHero from '@/components/meng-tab-hero.vue'
import MengAvatar from '@/components/meng-avatar.vue'
import HomeCharShowcase from '@/components/home-char-showcase.vue'
import MengAdBanner from '@/components/meng-ad-banner.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'

const HERO_POSES = ['wave', 'book', 'happy']

export default {
	components: { MengTabHero, MengAvatar, HomeCharShowcase, MengAdBanner },
	mixins: [tabMain, i18nPage],
	data() {
		return {
			assets: MENG_ASSETS,
			summary: '',
			vipActive: false,
			encourageText: '',
			dailyDesc: '',
			dailyBtnLabel: '',
			textbookVolumeLabel: '',
			wrongCount: 0,
			mascotFallback: false,
			heroDotIndex: 0,
			heroSlides: [],
			_welcomeTimer: null,
			_heroCarouselTimer: null,
			_heroResumeTimer: null,
			/** 同会话跳过重复 buildDailyTrainingPlan */
			_lastPlanKey: '',
			_lastPlanAt: 0,
			curriculumTabs: listHomeCurriculumTabs()
		}
	},
	computed: {
		heroBannerSlides() {
			const poses = HERO_POSES
			return (this.heroSlides || []).map((text, i) => ({
				text: String(text || ''),
				pose: this.mascotFallback
					? 'book'
					: poses[i % poses.length] || 'wave'
			}))
		},
		wrongCountDisplay() {
			const n = Number(this.wrongCount) || 0
			return n > 99 ? '99+' : String(n)
		},
		wrongEntrySub() {
			const n = Number(this.wrongCount) || 0
			if (n <= 0) return this.t('home.wrong.sub.empty')
			return this.t('home.wrong.sub.review')
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
	created() {
		this.dailyDesc = this.t('home.daily.loading')
		this.dailyBtnLabel = this.t('home.daily.btn.start')
		this.heroSlides = [
			this.t('home.hero.slide1'),
			this.t('home.hero.slide2'),
			this.t('home.hero.slide3')
		]
	},
	onShow() {
		this.setTabBarIndex(0)
		this.startHeroCarousel()
		this.refresh()
		this.scheduleWelcomeVoice()
		this.$refs.charShowcase?.pauseShowcase?.()
	},
	onHide() {
		this.$refs.charShowcase?.pauseShowcase?.()
		this.stopHeroCarousel()
		if (this._heroResumeTimer != null) {
			clearTimeout(this._heroResumeTimer)
			this._heroResumeTimer = null
		}
		if (this._welcomeTimer != null) {
			clearTimeout(this._welcomeTimer)
			this._welcomeTimer = null
		}
		stopMengmengVoice()
	},
	methods: {
		onLocaleChanged() {
			this._lastPlanKey = ''
			this._lastPlanAt = 0
			this.refresh()
		},
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
		startHeroCarousel() {
			this.stopHeroCarousel()
			this._heroCarouselTimer = setInterval(() => {
				if (!this.heroSlides.length) return
				this.heroDotIndex = (this.heroDotIndex + 1) % this.heroSlides.length
			}, 4500)
		},
		stopHeroCarousel() {
			if (this._heroCarouselTimer != null) {
				clearInterval(this._heroCarouselTimer)
				this._heroCarouselTimer = null
			}
		},
		onHeroDotTap(i) {
			this.heroDotIndex = i
			this.stopHeroCarousel()
			if (this._heroResumeTimer != null) clearTimeout(this._heroResumeTimer)
			this._heroResumeTimer = setTimeout(() => {
				this.startHeroCarousel()
				this._heroResumeTimer = null
			}, 8000)
		},
		async refresh() {
			this.summary = getCurriculumSummary()
			this.textbookVolumeLabel = formatGradeSemesterLabel(getCurriculumPrefs())
			this.vipActive = isVipActive()
			this.wrongCount = getWrongChars().length
			const p = getCurriculumPrefs()
			const planKey = [
				p.textbook_version_id,
				p.grade,
				p.semester,
				p.list_type_preference
			].join('|')
			const now = Date.now()
			const hasPlanUi =
				this.dailyDesc &&
				this.dailyDesc !== this.t('home.daily.loading') &&
				this.dailyDesc !== this.t('home.daily.loadFail')
			if (
				hasPlanUi &&
				this._lastPlanKey === planKey &&
				(now - this._lastPlanAt < 2000 || this._lastPlanAt > 0)
			) {
				this.encourageText = buildEncourageText({ remain: 5 })
				this.heroSlides = [
					this.dailyDesc,
					this.encourageText,
					this.t('home.hero.slide1')
				]
				return
			}
			const learned = countLearnedCharsForCurriculumPrefs(p)
			try {
				const plan = await buildDailyTrainingPlan(p)
				const summary = formatDailyPlanHomeSummary(plan, learned)
				this.dailyDesc = summary.desc
				this.dailyBtnLabel = summary.btnLabel
				this._lastPlanKey = planKey
				this._lastPlanAt = Date.now()
			} catch (e) {
				console.warn('[home] daily plan', e)
				this.dailyDesc = this.t('home.daily.loadFail')
				this.dailyBtnLabel = this.t('home.daily.btn.retry')
			}
			this.encourageText = buildEncourageText({ remain: 5 })
			this.heroSlides = [
				this.dailyDesc,
				this.encourageText,
				this.t('home.hero.slide1')
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
			uni.navigateTo({ url: '/pages/me/learned' })
		},
		goWritePractice() {
			playMengmengVoice(MENG_VOICE.HOME_STROKE_LAB, { debounceMs: 200 }).catch(() => {})
			void startWritePractice()
		},
		goWrongOften() {
			uni.navigateTo({ url: '/pages/me/wrong-often' })
		},
		goGame() {
			startLiteracyGame()
		},
		goComponentMap() {
			uni.navigateTo({ url: '/pages/tools/component-map' })
		},
		goDaily() {
			playMengmengVoice(MENG_VOICE.HOME_DAILY, { debounceMs: 200 }).catch(() => {})
			startDailyTraining()
		}
	}
}
</script>

<style scoped>
.home-page {
	box-sizing: border-box;
	width: 100%;
	max-width: 100%;
	overflow-x: hidden;
}

/* 首页内容区留左右握持间距（不用 tab-content-bleed 贴边） */
.home-page.tab-page-shell {
	padding-left: calc(32rpx + constant(safe-area-inset-left));
	padding-left: calc(32rpx + env(safe-area-inset-left));
	padding-right: calc(32rpx + constant(safe-area-inset-right));
	padding-right: calc(32rpx + env(safe-area-inset-right));
}

.home-main {
	padding-bottom: 8rpx;
	box-sizing: border-box;
}

.home-hero-dots {
	display: flex;
	justify-content: center;
	gap: 10rpx;
}

.home-hero-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: rgba(92, 61, 46, 0.2);
}

.home-hero-dot--on {
	width: 26rpx;
	border-radius: 8rpx;
	background: var(--meng-accent-solid);
}

.dock-glass {
	margin: 0;
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
	background: #ffd4b8;
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
	background: var(--meng-accent-solid);
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

.cta-row--single .cta-btn {
	flex: 1 1 100%;
	width: 100%;
}

.cta-btn {
	position: relative;
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
	background: var(--meng-accent-solid);
}

.cta-btn--pinyin {
	background: #c8e8d4;
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

.cta-badge {
	position: absolute;
	top: 8rpx;
	right: 10rpx;
	z-index: 2;
	min-width: 32rpx;
	height: 32rpx;
	padding: 0 8rpx;
	border-radius: 16rpx;
	background: #e85d4c;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	border: 2rpx solid #fff;
}

.cta-badge-text {
	font-size: 18rpx;
	font-weight: 800;
	color: #fff;
	line-height: 1;
}

.cta-icon-img {
	width: 40rpx;
	height: 40rpx;
}

.cta-text-col {
	flex: 1;
	min-width: 0;
}

.cta-text-col--badge {
	padding-right: 36rpx;
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

.quick-icon-ring--accent {
	background: rgba(255, 200, 180, 0.45);
}

.quick-icon-ring--yellow {
	background: #fff4d8;
}

.quick-icon-ring--coral {
	background: #ffe0d6;
}

.quick-icon-emoji {
	font-size: 36rpx;
	line-height: 1;
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
