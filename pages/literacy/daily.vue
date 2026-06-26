<!--
  @file daily.vue
  @layer L1 表现层
  @description 路由页面源文件：daily.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page
		title="每日一练"
		:subtitle="dailyHeroSub"
		avatar-pose="book"
		:padded="false"
		:overlap-body="true"
		:full-height="true"
	>
		<view class="daily-dock" :class="{ 'daily-dock--with-foot': showDailyFoot }">
			<view class="daily-dock-glass">
				<view v-if="dailyBlocked" class="daily-empty">
					<meng-avatar pose="curious" size="lg" />
					<text class="daily-empty-title">今日练习已完成</text>
					<text class="daily-empty-desc">{{ dailyBlockMessage }}</text>
					<view v-if="showDailyAdUnlock" class="daily-cta daily-cta--ad" @click="unlockDailyByAd">
						<text class="daily-cta-text">看短视频再练一轮</text>
					</view>
					<view class="daily-cta" @click="goVip">
						<text class="daily-cta-text">家长开通会员</text>
					</view>
					<view class="daily-cta daily-cta--ghost" @click="goBackHome">
						<text class="daily-cta-text daily-cta-text--ghost">返回首页</text>
					</view>
				</view>
				<view v-else-if="poolSize === 0" class="daily-empty">
					<meng-avatar pose="curious" size="lg" />
					<text class="daily-empty-title">暂无生字可练</text>
					<text class="daily-empty-desc">切换年级字表，或通过课本同步学选课。</text>
					<view class="daily-cta" @click="goCurriculum">
						<text class="daily-cta-text">教材设置</text>
					</view>
					<view class="daily-cta daily-cta--ghost" @click="goTextbook">
						<text class="daily-cta-text daily-cta-text--ghost">课本同步</text>
					</view>
				</view>

				<template v-else>
					<text v-if="focusLessonHint" class="daily-lesson-line clamp-1">学到：{{ focusLessonHint }}</text>

					<scroll-view scroll-x class="seg-scroll" :show-scrollbar="false">
						<view class="seg-row">
							<view
								v-for="seg in planSegments"
								:key="seg.key"
								class="seg-chip"
								:class="{
									'seg-chip--on': activeSegment === seg.key,
									'seg-chip--empty': !seg.items.length
								}"
								@click="pickSegment(seg.key)"
							>
								<text class="seg-chip-text">{{ seg.title }} {{ seg.items.length }}</text>
							</view>
						</view>
					</scroll-view>
					<text class="seg-hint">{{ activeSegmentSubtitle }}</text>

					<view v-if="!segmentItems.length" class="daily-panel daily-panel-empty">
						<text v-if="isWriteSegment">今日暂无练字推荐，可先完成复习。</text>
						<text v-else>这一段今天没有字，请切换其他标签。</text>
					</view>

					<template v-else>
						<view class="daily-progress">
							<text class="daily-progress-num">{{ currentIndex + 1 }}/{{ segmentItems.length }}</text>
							<view class="daily-bar">
								<view class="daily-bar-fill" :style="{ width: progressPercent }" />
							</view>
						</view>

						<!-- 练字：内嵌田字格书写 -->
						<view v-if="isWriteSegment && currentItem" class="daily-panel daily-panel--write">
							<view class="daily-write-head">
								<text class="daily-write-hanzi">{{ currentItem.hanzi }}</text>
								<text v-if="writeItemPinyin" class="daily-write-py font-pinyin">{{ writeItemPinyin }}</text>
							</view>
							<write-practice-panel
								ref="inlineWrite"
								:key="'daily-write-' + currentIndex + '-' + currentItem.hanzi"
								compact
								meng-voice
								:initial-hanzi="currentItem.hanzi"
								:initial-pinyin="writeItemPinyin"
								canvas-id="daily-write-canvas"
								@compact-complete="onInlineWriteComplete"
							/>
						</view>

						<!-- 复习认读 -->
						<view v-else-if="detailEntry" class="daily-panel daily-panel--char">
								<text
									v-if="reasonLabel && !isWeakReason"
									class="daily-tag"
									:class="'daily-tag--' + currentItem.reason"
									>{{ reasonLabel }}</text
								>

								<view class="daily-char-layout">
									<view class="daily-stroke-box">
										<text
											v-if="isWeakReason"
											class="daily-tag daily-tag--weak daily-tag--on-stroke"
											>{{ reasonLabel }}</text
										>
										<hanzi-stroke-player
											ref="strokePlayer"
											canvas-id="daily-stroke-player"
											:char="detailEntry.hanzi"
											:display-pinyin="strokeDisplayPinyin"
											:narrator="narrator"
											:length="148"
											:show-play-fab="true"
											:stroke-audio-enabled="true"
											:preview-only="true"
											:hide-stroke-hint="strokeHintOnSide"
											@animating-change="strokeAnimating = $event"
											@stroke-index="onStrokeIndexChange"
											@click-canvas="onTapPlayPinyin"
										/>
									</view>

									<view class="daily-char-side">
										<view class="daily-py-quiz">
											<text class="daily-py-quiz-prompt">哪个读音对？</text>
											<view v-if="pinyinChoices.length" class="daily-py-options">
												<view
													v-for="opt in pinyinChoices"
													:key="opt.id"
													class="daily-py-opt"
													:class="pinyinOptClass(opt)"
													@click.stop="onPickPinyinOption(opt)"
												>
													<view class="daily-py-opt-inner">
														<pinyin-four-lines-row
															v-if="opt.syllables.length === 1"
															class="py-core"
															:syllables="opt.syllables"
															size="md"
														/>
														<text v-else class="daily-py-opt-text font-pinyin">{{ opt.label }}</text>
													</view>
													<text v-if="pinyinOptionMark(opt)" class="daily-py-opt-mark">{{
														pinyinOptionMark(opt) === 'ok' ? '✓' : '✗'
													}}</text>
												</view>
											</view>
											<text v-else class="daily-py-quiz-pending">读音加载中…</text>
											<text v-if="pinyinQuizFeedback" class="daily-py-feedback">{{
												pinyinQuizFeedback
											}}</text>
											<text v-if="dailyStrokeHint" class="daily-stroke-hint">{{ dailyStrokeHint }}</text>
										</view>
									</view>
								</view>

								<view
									v-if="detailFetchComplete && dailyWordsList.length"
									class="daily-words-block"
								>
									<!-- <text class="daily-words-label">组词</text> -->
									<view class="daily-words-chips">
										<text
											v-for="(w, wi) in dailyWordsList"
											:key="'daily-word-' + wi"
											class="daily-word-chip"
											>{{ w }}</text
										>
									</view>
								</view>
								
								<view class="daily-quick-pair">
									<view
										class="quick-pill quick-pill--warm"
										:class="{ 'quick-pill--on': strokeAnimating }"
										@click.stop="toggleStrokeAnimation"
									>
										<text>{{ strokeAnimating ? '暂停笔顺' : '笔顺动画' }}</text>
									</view>
									<view class="quick-pill quick-pill--lavender" @click.stop="onTapPlayPinyin">
										<text>听读音</text>
									</view>
								</view>

								<text v-if="detailFetchComplete" class="daily-meta">{{ metaLine }}</text>
								<text v-else class="daily-meta daily-meta--pending">加载中…</text>

								<view v-if="hasDetailExtra" class="daily-extra">
									<text v-if="detailEntry.strokeShapes" class="daily-extra-line clamp-1">{{
										detailEntry.strokeShapes
									}}</text>
									<text v-if="detailEntry.strokeNames" class="daily-extra-sub clamp-1">{{
										detailEntry.strokeNames
									}}</text>
									<text v-if="detailFetchComplete && detailEntry.explainText" class="daily-extra-line clamp-2">{{
										detailEntry.explainText
									}}</text>
								</view>
						</view>

						<view v-else class="daily-panel daily-panel-empty">
							<text>加载中…</text>
						</view>
					</template>

					<view v-if="!isWriteSegment" class="daily-tip">
						<view class="daily-tip-row">
							<meng-avatar pose="happy" size="xs" />
							<text class="daily-tip-text">{{ tipLine }}</text>
						</view>
					</view>
				</template>
			</view>
		</view>

		<view v-if="showDailyFoot" class="daily-foot-fixed">
			<view
				class="foot-btn"
				:class="{ 'foot-btn--disabled': currentIndex <= 0 }"
				@click="goPrev"
			>
				<text class="foot-btn-text">上一字</text>
			</view>
			<view class="foot-btn" @click="markLearned">
				<text class="foot-btn-text">已学</text>
			</view>
			<view class="foot-btn" @click="markWrong">
				<text class="foot-btn-text">易错</text>
			</view>
			<view
				class="foot-btn foot-btn--primary"
				:class="{ 'foot-btn--disabled': currentIndex >= segmentItems.length - 1 }"
				@click="goNext"
			>
				<text class="foot-btn-text foot-btn-text--on">下一字</text>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { getCurriculumPrefs, formatGradeSemesterLabel } from '@/utils/curriculum-storage.js'
import {
	buildDailyTrainingPlan,
	dailyReasonLabel
} from '@/services/daily-training-service.js'
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'
import { recordCharLearned, recordCharWrong } from '@/repositories/learning-repository.js'
import {
	speakDictionaryEntryPinyin,
	DICTIONARY_LOCAL_PINYIN_OPTS
} from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import {
	stopStrokeOrderAudio,
	getCncharStrokeNameList
} from '@/utils/stroke-order-audio.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { startTextbookLearning } from '@/modules/literacy/usecases/start-textbook-learning.js'
import HanziStrokePlayer from '@/components/hanzi-stroke-player.vue'
import WritePracticePanel from '@/pages/literacy/write-practice.vue'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { buildDailyReviewPinyinChoices } from '@/utils/daily-pinyin-quiz.js'
import MengAvatar from '@/components/meng-avatar.vue'
import {
	MENG_VOICE,
	getMengmengVoiceCopy,
	playMengmengVoice,
	stopMengmengVoice,
	voiceIdForDailySegment,
	waitForMengmengVoiceIdle
} from '@/utils/mengmeng-voice.js'
import { LESSON_AUDIO_GAP_MS, sleepMs } from '@/utils/lesson-mode-audio.js'
import { VIP_QUOTA_LIMITS } from '@/constants/vip-quota-limits.js'
import { gateVipFeature, peekQuota, grantAdQuotaReward, VIP_FEATURE, QUOTA_KEYS } from '@/utils/vip-gate.js'
import { isVipActive } from '@/utils/vip.js'
import { shouldShowAds } from '@/utils/ad-service.js'
import { AD_PLACEMENTS } from '@/constants/ad-placements.js'
import { recordDailySessionComplete } from '@/utils/achievement-stats-storage.js'

export default {
	components: {
		MengSubPage,
		PinyinFourLinesRow,
		HanziStrokePlayer,
		WritePracticePanel,
		MengAvatar
	},
	data() {
		return {
			plan: null,
			dateKey: '',
			poolSize: 0,
			focusLessonHint: '',
			activeSegment: 'review',
			currentIndex: 0,
			detailEntry: null,
			narrator: 'kid',
			dictPinyinPlaying: false,
			detailFetchComplete: false,
			strokeAnimating: false,
			dailyStrokeIndex: 0,
			dailyStrokeNames: [],
			pinyinChoices: [],
			pinyinCorrect: '',
			pinyinQuizPassed: false,
			pinyinPickId: '',
			pinyinQuizFeedback: '',
			dailyBlocked: false,
			dailyBlockMessage: ''
		}
	},
	computed: {
		volumeLabel() {
			return formatGradeSemesterLabel(getCurriculumPrefs())
		},
		dailyHeroSub() {
			return `${this.volumeLabel} · ${this.headSubLine}`
		},
		planSegments() {
			return this.plan?.segments || []
		},
		segmentItems() {
			const seg = this.planSegments.find((s) => s.key === this.activeSegment)
			return seg?.items || []
		},
		showDailyFoot() {
			return this.poolSize > 0 && this.segmentItems.length > 0
		},
		showDailyAdUnlock() {
			return this.dailyBlocked && shouldShowAds()
		},
		activeSegmentSubtitle() {
			const seg = this.planSegments.find((s) => s.key === this.activeSegment)
			return seg?.subtitle || ''
		},
		headSubLine() {
			if (!this.dateKey && !this.plan?.stats) return '复习 · 练字'
			const parts = []
			if (this.dateKey) parts.push(this.dateKey)
			const st = this.plan?.stats
			if (st) {
				const bits = []
				if (st.review + st.weak > 0) bits.push(`复习${st.review + st.weak}`)
				if (st.write > 0) bits.push(`练字${st.write}`)
				if (bits.length) parts.push(bits.join(' '))
			}
			return parts.join(' · ')
		},
		strokeHintOnSide() {
			return this.isReviewSegment
		},
		dailyStrokeHint() {
			if (!this.strokeHintOnSide || !this.dailyStrokeNames.length) return ''
			const label = this.dailyStrokeNames[this.dailyStrokeIndex]
			if (!label) return ''
			return `第 ${this.dailyStrokeIndex + 1} 笔 · ${label}`
		},
		isReviewSegment() {
			return this.activeSegment === 'review'
		},
		isWriteSegment() {
			return this.activeSegment === 'write'
		},
		writeItemPinyin() {
			const it = this.currentItem
			if (!it || !it.pinyin) return ''
			return String(it.pinyin).replace(/\s+/g, ' ').trim()
		},
		tipLine() {
			if (this.isWriteSegment) return '按住田字格，按笔顺写完每一笔'
			return '点对的拼音，再记一记这个字'
		},
		dailyQuizPoolItems() {
			const items = []
			const seen = new Set()
			const push = (it) => {
				const h = String(it?.hanzi || '').trim().charAt(0)
				if (!h || seen.has(h)) return
				seen.add(h)
				items.push(it)
			}
			for (const seg of this.planSegments) {
				for (const it of seg.items || []) push(it)
			}
			return items
		},
		progressPercent() {
			if (!this.segmentItems.length) return '0%'
			const pct = Math.round(((this.currentIndex + 1) / this.segmentItems.length) * 100)
			return `${Math.min(100, Math.max(0, pct))}%`
		},
		metaLine() {
			const e = this.detailEntry
			if (!e) return ''
			const bits = []
			if (e.radical) bits.push(`部首 ${e.radical}`)
			if (e.structure) bits.push(e.structure)
			if (e.strokes) bits.push(`${e.strokes} 画`)
			return bits.length ? bits.join(' · ') : '—'
		},
		hasDetailExtra() {
			const e = this.detailEntry
			if (!e) return false
			if (e.strokeShapes || e.strokeNames) return true
			if (this.detailFetchComplete && e.explainText) return true
			return false
		},
		currentItem() {
			return this.segmentItems[this.currentIndex] || null
		},
		reasonLabel() {
			return this.currentItem ? dailyReasonLabel(this.currentItem.reason) : ''
		},
		isWeakReason() {
			return this.currentItem?.reason === 'weak'
		},
		strokeDisplayPinyin() {
			return String(this.detailEntry?.pinyin || '').replace(/[()（）]/g, '').trim()
		},
		/** 当前字组词，最多 5 个（来自查字详情） */
		dailyWordsList() {
			const raw = this.detailEntry?.words
			if (!Array.isArray(raw) || !raw.length) return []
			const out = []
			const seen = Object.create(null)
			for (const w of raw) {
				const k = String(w || '').trim()
				if (!k || k === '暂无组词' || seen[k]) continue
				seen[k] = 1
				out.push(k)
				if (out.length >= 5) break
			}
			return out
		},
	},
	async onShow() {
		this.narrator = getAudioNarrator()
		await this.reload()
		playMengmengVoice(voiceIdForDailySegment(this.activeSegment), { debounceMs: 400 }).catch(
			() => {}
		)
	},
	onHide() {
		this.teardownMedia()
	},
	onUnload() {
		this.teardownMedia()
	},
	methods: {
		teardownMedia() {
			stopMengmengVoice()
			stopLocalPinyinAudio()
			stopStrokeOrderAudio()
			this.stopStrokePlayer()
		},
		refreshDailyStrokeNames() {
			const h = this.detailEntry?.hanzi
			if (!h) {
				this.dailyStrokeNames = []
				this.dailyStrokeIndex = 0
				return
			}
			this.dailyStrokeNames = getCncharStrokeNameList(h)
			this.dailyStrokeIndex = 0
		},
		onStrokeIndexChange(idx) {
			if (!this.strokeHintOnSide) return
			const n = Number(idx)
			this.dailyStrokeIndex = Number.isFinite(n) && n >= 0 ? n : 0
		},
		stopInlineWrite() {
			const w = this.$refs.inlineWrite
			if (w && typeof w.stopAllPracticeAudio === 'function') {
				w.stopAllPracticeAudio()
			}
		},
		stopStrokePlayer() {
			this.stopInlineWrite()
			const p = this.$refs.strokePlayer
			if (p && typeof p.stopAnimation === 'function') {
				p.stopAnimation()
			}
			this.strokeAnimating = false
		},
		toggleStrokeAnimation() {
			const p = this.$refs.strokePlayer
			if (p && typeof p.toggleAnimation === 'function') {
				p.toggleAnimation()
				return
			}
			uni.showToast({ title: '笔顺暂不可用', icon: 'none' })
		},
		goCurriculum() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		goTextbook() {
			startTextbookLearning()
		},
		pickSegment(key) {
			const seg = this.planSegments.find((s) => s.key === key)
			if (!seg || !seg.items.length) {
				uni.showToast({ title: '这一段今天没有字', icon: 'none' })
				return
			}
			if (key === this.activeSegment) return
			this.stopStrokePlayer()
			this.activeSegment = key
			this.currentIndex = 0
			if (key !== 'write') {
				void this.loadCurrentDetail()
			} else {
				this.detailEntry = null
			}
			playMengmengVoice(voiceIdForDailySegment(key)).catch(() => {})
		},
		pickFirstSegmentWithItems() {
			for (const key of ['review', 'write']) {
				const seg = this.planSegments.find((s) => s.key === key)
				if (seg?.items?.length) {
					this.activeSegment = key
					this.currentIndex = 0
					return
				}
			}
			this.activeSegment = 'review'
			this.currentIndex = 0
		},
		goVip() {
			uni.navigateTo({ url: '/pages/vip/vip' })
		},
		async unlockDailyByAd() {
			const ok = await grantAdQuotaReward(AD_PLACEMENTS.DAILY_EXTRA_ROUND)
			if (ok) await this.reload()
		},
		goBackHome() {
			uni.switchTab({ url: '/pages/home/home' })
		},
		async reload() {
			if (!isVipActive()) {
				const peek = peekQuota(
					QUOTA_KEYS.DAILY_SESSION,
					VIP_QUOTA_LIMITS[QUOTA_KEYS.DAILY_SESSION]
				)
				if (!peek.ok) {
					this.dailyBlocked = true
					this.dailyBlockMessage = peek.message || '免费版每日 1 轮，明日再来或由家长开通会员。'
					this.plan = null
					this.poolSize = 0
					return
				}
				const g = gateVipFeature(VIP_FEATURE.DAILY_UNLIMITED, {
					quotaKey: QUOTA_KEYS.DAILY_SESSION,
					quotaLimit: VIP_QUOTA_LIMITS[QUOTA_KEYS.DAILY_SESSION],
					consume: true
				})
				if (!g.ok) {
					this.dailyBlocked = true
					this.dailyBlockMessage = g.message || ''
					this.plan = null
					this.poolSize = 0
					return
				}
			}
			this.dailyBlocked = false
			this.dailyBlockMessage = ''
			const p = getCurriculumPrefs()
			const plan = await buildDailyTrainingPlan(p)
			this.plan = plan
			this.dateKey = plan.dateKey
			this.poolSize = plan.poolSize
			this.focusLessonHint = plan.focusLessonHint || ''
			this.pickFirstSegmentWithItems()
			if (this.activeSegment !== 'write') {
				await this.loadCurrentDetail()
			} else {
				this.stopStrokePlayer()
				this.detailEntry = null
			}
		},
		async goNext() {
			if (this.isReviewSegment && this.pinyinChoices.length && !this.pinyinQuizPassed) {
				uni.showToast({ title: '请先点选正确读音', icon: 'none' })
				return
			}
			if (this.currentIndex >= this.segmentItems.length - 1) {
				recordDailySessionComplete()
				playMengmengVoice(MENG_VOICE.DAILY_COMPLETE, { minGapMs: 2000 }).catch(() => {})
				return
			}
			this.stopStrokePlayer()
			this.currentIndex += 1
			if (!this.isWriteSegment) {
				await this.loadCurrentDetail()
			}
		},
		async goPrev() {
			if (this.currentIndex <= 0) return
			this.stopStrokePlayer()
			this.currentIndex -= 1
			if (!this.isWriteSegment) {
				await this.loadCurrentDetail()
			}
		},
		resetPinyinQuiz() {
			this.pinyinChoices = []
			this.pinyinCorrect = ''
			this.pinyinQuizPassed = false
			this.pinyinPickId = ''
			this.pinyinQuizFeedback = ''
		},
		setupReviewPinyinChoices() {
			const it = this.currentItem
			if (!it || !this.detailEntry) {
				this.resetPinyinQuiz()
				return
			}
			const target = {
				hanzi: this.detailEntry.hanzi,
				pinyin: this.detailEntry.pinyin || it.pinyin
			}
			const { correct, choices } = buildDailyReviewPinyinChoices(target, this.dailyQuizPoolItems)
			this.pinyinCorrect = correct
			this.pinyinChoices = choices
			this.pinyinQuizPassed = !choices.length
			this.pinyinPickId = ''
			this.pinyinQuizFeedback = choices.length ? '点一个你认为对的读音' : ''
			if (choices.length) {
				playMengmengVoice(MENG_VOICE.DAILY_QUIZ_PROMPT, { debounceMs: 350 }).catch(() => {})
			}
		},
		pinyinOptClass(opt) {
			if (!this.pinyinPickId) return ''
			if (opt.id !== this.pinyinPickId) {
				if (this.pinyinQuizPassed && opt.isCorrect) return 'daily-py-opt--ok'
				return ''
			}
			return opt.isCorrect ? 'daily-py-opt--ok' : 'daily-py-opt--bad'
		},
		pinyinOptionMark(opt) {
			if (!this.pinyinPickId || opt.id !== this.pinyinPickId) {
				if (this.pinyinQuizPassed && opt.isCorrect) return 'ok'
				return ''
			}
			return opt.isCorrect ? 'ok' : 'bad'
		},
		async onPickPinyinOption(opt) {
			if (!opt || this.pinyinQuizPassed) return
			this.pinyinPickId = opt.id
			await speakDictionaryEntryPinyin({
				hanzi: this.detailEntry.hanzi,
				fallbackPinyin: opt.label,
				narrator: this.narrator,
				...DICTIONARY_LOCAL_PINYIN_OPTS
			})
			stopLocalPinyinAudio()
			await sleepMs(LESSON_AUDIO_GAP_MS)
			if (opt.isCorrect) {
				this.pinyinQuizPassed = true
				this.pinyinQuizFeedback =
					getMengmengVoiceCopy(MENG_VOICE.DAILY_QUIZ_CORRECT) || '太棒了，读对了！'
				await playMengmengVoice(MENG_VOICE.DAILY_QUIZ_CORRECT)
			} else {
				this.pinyinQuizFeedback = `再试试，正确是「${this.pinyinCorrect}」`
				await playMengmengVoice(MENG_VOICE.DAILY_QUIZ_WRONG)
				recordCharWrong(this.detailEntry.hanzi, 1, getCurriculumPrefs())
			}
		},
		async replayPinyinWithVoice() {
			await playMengmengVoice(MENG_VOICE.DAILY_PINYIN_REPLAY, { minGapMs: 600 })
			await sleepMs(LESSON_AUDIO_GAP_MS)
			await this.speakCurrentPinyin()
		},
		onInlineWriteComplete() {
			if (this.currentIndex >= this.segmentItems.length - 1) {
				recordDailySessionComplete()
				playMengmengVoice(MENG_VOICE.DAILY_COMPLETE, { minGapMs: 2000 }).catch(() => {})
			}
		},
		applySegmentPinyinMode() {
			if (!this.detailEntry || this.activeSegment === 'write') return
			if (this.isReviewSegment) {
				this.setupReviewPinyinChoices()
			} else {
				this.resetPinyinQuiz()
			}
		},
		async loadCurrentDetail() {
			const it = this.currentItem
			if (!it || !it.hanzi || this.activeSegment === 'write') {
				this.resetPinyinQuiz()
				this.detailFetchComplete = false
				this.detailEntry = null
				return
			}
			this.resetPinyinQuiz()
			this.detailFetchComplete = false
			this.detailEntry = this.buildDetailStubFromItem(it)
			try {
				const hint = it.lesson_hint != null ? String(it.lesson_hint) : ''
				const entry = await getDictionaryEntry(it.hanzi, hint)
				if (entry) {
					const pyFromRow = it.pinyin != null ? String(it.pinyin).replace(/\s+/g, ' ').trim() : ''
					this.detailEntry = {
						...entry,
						pinyin: pyFromRow || entry.pinyin || '',
						lessonHint: it.lesson_hint != null ? String(it.lesson_hint) : entry.lessonHint || ''
					}
					this.detailFetchComplete = true
				} else {
					this.detailEntry = null
				}
			} catch (e) {
				console.warn('[daily] loadCurrentDetail', e)
				this.detailEntry = null
			} finally {
				if (this.detailEntry?.hanzi) {
					this.refreshDailyStrokeNames()
					this.applySegmentPinyinMode()
				}
			}
		},
		buildDetailStubFromItem(it) {
			const h = it.hanzi
			const pyRaw = it.pinyin != null ? String(it.pinyin).replace(/\s+/g, ' ').trim() : ''
			return {
				hanzi: h,
				pinyin: pyRaw,
				radical: '',
				structure: '',
				strokes: 0,
				lessonHint: it.lesson_hint != null ? String(it.lesson_hint) : '',
				strokeShapes: '',
				strokeNames: '',
				explainText: '',
				words: []
			}
		},
		async onTapPlayPinyin() {
			if (!this.detailEntry?.hanzi || this.dictPinyinPlaying) return
			await this.replayPinyinWithVoice()
		},
		async speakCurrentPinyin() {
			if (!this.detailEntry?.hanzi || this.dictPinyinPlaying) return
			this.dictPinyinPlaying = true
			try {
				await speakDictionaryEntryPinyin({
					hanzi: this.detailEntry.hanzi,
					fallbackPinyin: this.detailEntry.pinyin,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
			} finally {
				this.dictPinyinPlaying = false
			}
		},
		markLearned() {
			const h = this.detailEntry?.hanzi || this.currentItem?.hanzi
			if (!h) return
			recordCharLearned(h, getCurriculumPrefs())
			uni.showToast({ title: '已加入学过字库', icon: 'success' })
		},
		markWrong() {
			const h = this.detailEntry?.hanzi || this.currentItem?.hanzi
			if (!h) return
			recordCharWrong(h, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none' })
		}
	}
}
</script>

<style scoped>
.daily-dock {
	flex: 1;
	min-height: 0;
	padding-bottom: 20rpx;
}

.daily-dock--with-foot {
	padding-bottom: calc(152rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(152rpx + env(safe-area-inset-bottom));
}

.daily-dock-glass {
	margin: 0 20rpx;
	padding: 22rpx 20rpx 18rpx;
	border-radius: 36rpx 36rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 -12rpx 48rpx var(--meng-shadow), 0 16rpx 40rpx var(--meng-shadow);
}

.daily-lesson-line {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	margin-bottom: 12rpx;
}

.seg-scroll {
	width: 100%;
	margin-bottom: 8rpx;
}

.seg-row {
	display: flex;
	flex-direction: row;
	white-space: nowrap;
	padding: 4rpx 0;
}

.seg-chip {
	display: inline-flex;
	padding: 12rpx 24rpx;
	margin-right: 12rpx;
	border-radius: 999rpx;
	background: rgba(255, 240, 248, 0.92);
	border: 2rpx solid rgba(255, 180, 200, 0.22);
}

.seg-chip--on {
	background: #ffd4f0;
	border-color: var(--meng-chip-active-border);
	box-shadow: 0 6rpx 16rpx rgba(255, 120, 160, 0.16);
}

.seg-chip--empty {
	opacity: 0.42;
}

.seg-chip-text {
	font-size: 24rpx;
	font-weight: 600;
	color: #8a6a78;
}

.seg-chip--on .seg-chip-text {
	color: #c44d6a;
}

.seg-hint {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	margin-bottom: 14rpx;
	line-height: 1.35;
}

.daily-progress {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 14rpx;
	margin-bottom: 12rpx;
}

.daily-progress-num {
	font-size: 24rpx;
	font-weight: 700;
	color: #c44d6a;
	flex-shrink: 0;
}

.daily-bar {
	flex: 1;
	height: 8rpx;
	border-radius: 999rpx;
	background: var(--meng-border);
	overflow: hidden;
}

.daily-bar-fill {
	height: 100%;
	border-radius: 999rpx;
	background: var(--meng-accent-solid);
	transition: width 0.2s ease;
}

.daily-panel {
	margin-bottom: 12rpx;
}

.daily-panel--char {
	padding: 4rpx 0 0;
}

.daily-panel-empty {
	padding: 28rpx 12rpx;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	text-align: center;
	line-height: 1.5;
}

.daily-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx 8rpx;
	text-align: center;
}

.daily-empty-emoji {
	font-size: 64rpx;
	margin-bottom: 12rpx;
}

.daily-empty-title {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 10rpx;
}

.daily-empty-desc {
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	line-height: 1.5;
	margin-bottom: 24rpx;
}

.daily-cta {
	width: 100%;
	height: 84rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 14rpx;
	background: var(--meng-accent-solid);
	box-shadow: 0 10rpx 28rpx var(--meng-shadow-warm);
}

.daily-cta--ad {
	background: #fff8e8;
	border-color: #e8d4a8;
}

.daily-cta--ghost {
	background: rgba(255, 240, 248, 0.95);
	border: 2rpx solid rgba(255, 180, 200, 0.35);
	box-shadow: none;
}

.daily-cta-text {
	font-size: 28rpx;
	font-weight: 700;
	color: #fff;
}

.daily-cta-text--ghost {
	color: #c44d6a;
}

.daily-tag {
	display: inline-block;
	font-size: 20rpx;
	font-weight: 600;
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	margin-bottom: 10rpx;
}

.daily-tag--weak {
	color: #b84a28;
	background: #fff4ec;
}

.daily-tag--review {
	color: #3d6b4a;
	background: var(--meng-leaf-soft);
}

.daily-char-layout {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 16rpx;
	margin-bottom: 14rpx;
}

.daily-stroke-box {
	position: relative;
	flex-shrink: 0;
	padding: 8rpx;
	border-radius: 20rpx;
	background: #fffaf6;
	border: 2rpx solid rgba(235, 227, 216, 0.9);
	box-shadow: inset 0 2rpx 8rpx rgba(44, 36, 25, 0.04);
}

.daily-tag--on-stroke {
	position: absolute;
	top: 4rpx;
	right: 4rpx;
	z-index: 5;
	margin: 0;
	box-shadow: 0 2rpx 10rpx rgba(184, 74, 40, 0.12);
}

.daily-char-side {
	flex: 1;
	min-width: 0;
	padding-top: 8rpx;
}

.daily-stroke-hint {
	display: block;
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.45;
	color: var(--meng-text-muted);
	font-weight: 500;
}

.daily-py-quiz {
	width: 100%;
}

.daily-py-quiz-prompt {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 12rpx;
}

.daily-py-quiz-pending {
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.daily-py-options {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.daily-py-opt {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 12rpx 14rpx;
	border-radius: 16rpx;
	background: rgba(255, 240, 248, 0.6);
	border: 2rpx solid rgba(255, 180, 200, 0.28);
}

.daily-py-opt--ok {
	background: var(--meng-leaf-soft);
	border-color: rgba(107, 174, 125, 0.45);
}

.daily-py-opt--bad {
	background: #fff4ec;
	border-color: rgba(255, 140, 90, 0.45);
}

.daily-py-opt-inner {
	flex: 1;
	min-width: 0;
}

.daily-py-opt-text {
	font-size: 30rpx;
	line-height: 1.25;
	color: var(--meng-text);
}

.daily-py-opt-mark {
	font-size: 28rpx;
	font-weight: 800;
	margin-left: 10rpx;
	flex-shrink: 0;
}

.daily-py-feedback {
	display: block;
	margin-top: 12rpx;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.4;
}

.py-core {
	width: 100%;
}

.daily-quick-pair {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 14rpx;
}

.quick-pill {
	flex: 1;
	min-width: calc(50% - 8rpx);
	height: 64rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 16rpx rgba(44, 36, 25, 0.08);
}

.quick-pill text {
	font-size: 24rpx;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.95);
}

.quick-pill--warm {
	background: #ffd060;
}

.quick-pill--warm.quick-pill--on {
	background: #ff8aab;
}

.quick-pill--lavender {
	background: #cfc8f5;
}

.quick-pill--lavender text {
	color: #5a5280;
}

.daily-words-block {
	margin-bottom: 14rpx;
	padding: 14rpx 16rpx;
	border-radius: 16rpx;
	background: rgba(255, 252, 248, 0.95);
	border: 1rpx solid rgba(235, 227, 216, 0.85);
}

.daily-words-label {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
	margin-bottom: 10rpx;
}

.daily-words-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 10rpx;
}

.daily-word-chip {
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text);
	background: #fff;
	border: 1rpx solid rgba(200, 190, 175, 0.55);
}

.daily-meta {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.4;
	padding-top: 12rpx;
	border-top: 1rpx solid var(--meng-border);
}

.daily-meta--pending {
	color: var(--meng-text-muted);
}

.daily-extra {
	padding-top: 10rpx;
}

.daily-extra-line {
	display: block;
	font-size: 28rpx;
	color: var(--meng-text);
	line-height: 1.4;
	margin-top: 6rpx;
}

.daily-extra-sub {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	margin-top: 4rpx;
}

.daily-panel--write {
	padding: 12rpx 14rpx 14rpx;
	background: transparent;
	box-shadow: none;
	border: none;
}

.daily-write-head {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	justify-content: center;
	gap: 14rpx;
	margin-bottom: 8rpx;
}

.daily-write-hanzi {
	font-size: 44rpx;
	font-weight: 800;
	color: var(--meng-text);
	line-height: 1;
}

.daily-write-py {
	font-size: 28rpx;
	color: var(--meng-text-secondary);
}

.daily-foot-fixed {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 120;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	gap: 12rpx;
	padding: 14rpx 20rpx;
	padding-bottom: calc(14rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(14rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	background: rgba(255, 253, 248, 0.97);
	border-top: 1rpx solid var(--meng-border-warm, #e3d9c8);
	box-shadow: 0 -10rpx 36rpx var(--meng-shadow, rgba(44, 36, 25, 0.1));
}

.foot-btn {
	flex: 1;
	min-width: 0;
	height: 92rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(255, 240, 248, 0.95);
	border: 2rpx solid rgba(255, 180, 200, 0.28);
}

.foot-btn--primary {
	background: #ff6b9d;
	border-color: transparent;
	box-shadow: 0 8rpx 22rpx rgba(255, 100, 150, 0.28);
}

.foot-btn--disabled {
	opacity: 0.4;
	pointer-events: none;
}

.foot-btn-text {
	font-size: 30rpx;
	font-weight: 700;
	color: #c44d6a;
	line-height: 1.2;
}

.foot-btn-text--on {
	color: #fff;
}

.daily-tip {
	margin-top: 8rpx;
	padding: 14rpx 16rpx;
	border-radius: 20rpx;
	background: var(--meng-tip-bg);
	border: 1rpx solid var(--meng-border-warm);
}

.daily-tip-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
}

.daily-tip-text {
	flex: 1;
	font-size: 24rpx;
	color: var(--meng-tip-text);
	line-height: 1.45;
}

.clamp-1 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 1;
	line-clamp: 1;
	overflow: hidden;
}

.clamp-2 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
}
</style>
