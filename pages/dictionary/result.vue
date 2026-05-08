<template>
	<view class="page">
		<view class="card">
			<text class="big-char">{{ hanzi || '—' }}</text>
			<text class="title">拼音：{{ pinyin || '-' }}</text>
			<text class="desc">课次：{{ lessonHint || '未分课次' }}</text>
			<view class="meta-grid">
				<view class="meta-item">
					<text class="meta-label">部首</text>
					<text class="meta-value">{{ ext.radical }}</text>
				</view>
				<view class="meta-item">
					<text class="meta-label">结构</text>
					<text class="meta-value">{{ ext.structure }}</text>
				</view>
				<view class="meta-item">
					<text class="meta-label">笔画</text>
					<text class="meta-value">{{ ext.strokes }}</text>
				</view>
			</view>
			<text class="words-title">常用组词</text>
			<text class="words">{{ ext.words.join(' / ') }}</text>
			<view class="actions">
				<button size="mini" type="primary" @click="goStroke">笔顺动画</button>
				<button size="mini" type="default" @click="markLearned">加入已学</button>
				<button size="mini" type="warn" @click="markWrong">加入易错</button>
			</view>
			<text v-if="sameLesson.length" class="words-title">同课推荐</text>
			<view v-if="sameLesson.length" class="tags">
				<text v-for="ch in sameLesson" :key="`s-${ch}`" class="tag" @click="goOther(ch)">{{ ch }}</text>
			</view>
			<text v-if="similarChars.length" class="words-title">相近字推荐</text>
			<view v-if="similarChars.length" class="tags">
				<text v-for="ch in similarChars" :key="`p-${ch}`" class="tag" @click="goOther(ch)">{{ ch }}</text>
			</view>
		</view>
	</view>
</template>
<script>
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { recordCharLearned, recordCharWrong } from '@/repositories/learning-repository.js'
import { getDictionaryEntry, getDictionaryRelated } from '@/repositories/dictionary-repository.js'

export default {
	data() {
		return {
			hanzi: '',
			pinyin: '',
			lessonHint: '',
			ext: {
				radical: '-',
				structure: '-',
				strokes: '-',
				words: ['暂无组词']
			},
			sameLesson: [],
			similarChars: []
		}
	},
	async onLoad(query) {
		this.hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		this.pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
		this.lessonHint = query.lesson ? decodeURIComponent(query.lesson) : ''
		const entry = await getDictionaryEntry(this.hanzi, this.lessonHint)
		if (entry) {
			this.pinyin = this.pinyin || entry.pinyin || ''
			this.lessonHint = this.lessonHint || entry.lessonHint || ''
			this.ext = {
				radical: entry.radical,
				structure: entry.structure,
				strokes: entry.strokes,
				words: entry.words
			}
		}
		const related = await getDictionaryRelated(this.hanzi, this.lessonHint)
		this.sameLesson = related.sameLesson || []
		this.similarChars = related.similar || []
	},
	methods: {
		goStroke() {
			uni.navigateTo({ url: `/pages/tools/stroke?hanzi=${encodeURIComponent(this.hanzi)}&mode=animation` })
		},
		markLearned() {
			if (!this.hanzi) return
			recordCharLearned(this.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入学过字库', icon: 'success' })
		},
		markWrong() {
			if (!this.hanzi) return
			recordCharWrong(this.hanzi, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none' })
		},
		goOther(ch) {
			uni.redirectTo({
				url: `/pages/dictionary/result?hanzi=${encodeURIComponent(ch)}&lesson=${encodeURIComponent(this.lessonHint)}`
			})
		}
	}
}
</script>
<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f1ea; }
.card { background: #fff; border-radius: 14rpx; padding: 24rpx; }
.big-char { display: block; font-size: 140rpx; line-height: 1; color: #2c2419; text-align: center; margin-bottom: 14rpx; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; margin-bottom: 16rpx; }
.meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10rpx; margin-bottom: 12rpx; }
.meta-item { background: #fff8eb; border-radius: 10rpx; padding: 12rpx 10rpx; text-align: center; }
.meta-label { display: block; font-size: 20rpx; color: #8a8279; }
.meta-value { display: block; margin-top: 4rpx; font-size: 26rpx; color: #2c2419; font-weight: 600; }
.words-title { display: block; font-size: 24rpx; color: #6b6560; margin-bottom: 6rpx; }
.words { display: block; font-size: 26rpx; color: #2c2419; margin-bottom: 16rpx; line-height: 1.5; }
.actions { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 8rpx 0 12rpx; }
.tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: #fff1d4; font-size: 24rpx; color: #6a5120; }
</style>
