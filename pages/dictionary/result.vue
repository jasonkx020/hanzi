<template>
	<view class="page">
		<view class="card">
			<text class="big-char" @click="onBigCharTap">{{ hanzi || '—' }}</text>
			<text class="title">拼音：{{ pinyin || '-' }}</text>
			<text class="desc">课次：{{ lessonHint || '未分课次' }}</text>
			<view v-if="ext.tradForm" class="trad-banner">
				<text class="trad-b-label">繁体</text>
				<text class="trad-b-val">{{ ext.tradForm }}</text>
			</view>
			<view class="meta-grid">
				<view class="meta-item">
					<text class="meta-label">部首2</text>
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
			<view v-if="ext.strokeShapes || ext.strokeNames" class="stroke-panel">
				<text class="stroke-p-title">笔顺（cnchar-order）</text>
				<text v-if="ext.strokeShapes" class="stroke-p-glyphs">{{ ext.strokeShapes }}</text>
				<text v-if="ext.strokeNames" class="stroke-p-names">{{ ext.strokeNames }}</text>
			</view>
			<view v-if="ext.explainText" class="explain-panel">
				<text class="explain-p-title">释义（cnchar-explain）</text>
				<text class="explain-p-body">{{ ext.explainText }}</text>
			</view>
			<text class="words-title">组词（cnchar-words）</text>
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
import { speakHanzi } from '@/utils/speak-hanzi.js'
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
				words: ['暂无组词'],
				explainText: '',
				strokeShapes: '',
				strokeNames: '',
				tradForm: ''
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
			this.pinyin = String(this.pinyin || entry.pinyin || '').replace(/\s+/g, ' ').trim()
			this.lessonHint = this.lessonHint || entry.lessonHint || ''
			this.ext = {
				radical: entry.radical,
				structure: entry.structure,
				strokes: entry.strokes,
				words: entry.words,
				explainText: entry.explainText || '',
				strokeShapes: entry.strokeShapes || '',
				strokeNames: entry.strokeNames || '',
				tradForm: entry.tradForm || ''
			}
		}
		if (!entry && this.pinyin) {
			this.pinyin = String(this.pinyin || '').replace(/\s+/g, ' ').trim()
		}
		const related = await getDictionaryRelated(this.hanzi, this.lessonHint)
		this.sameLesson = related.sameLesson || []
		this.similarChars = related.similar || []
	},
	methods: {
		onBigCharTap() {
			if (!this.hanzi || this.hanzi === '—') return
			speakHanzi(this.hanzi)
		},
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
			speakHanzi(ch)
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
.meta-grid { display: flex; flex-direction: row; flex-wrap: wrap; margin-bottom: 12rpx; }
.meta-item {
	flex: 0 0 31%;
	width: 31%;
	max-width: 31%;
	box-sizing: border-box;
	margin-right: 3.5%;
	margin-bottom: 10rpx;
	background: #fff8eb;
	border-radius: 10rpx;
	padding: 12rpx 10rpx;
	text-align: center;
}
.meta-item:nth-child(3n) { margin-right: 0; }
.trad-banner {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 14rpx;
	padding: 12rpx 14rpx;
	background: #e3f2fd;
	border-radius: 10rpx;
}
.trad-b-label { font-size: 22rpx; color: #1565c0; font-weight: 700; margin-right: 10rpx; }
.trad-b-val { font-size: 30rpx; color: #0d47a1; font-weight: 700; }
.stroke-panel {
	margin-bottom: 14rpx;
	padding: 14rpx;
	background: #f9fbe7;
	border-radius: 10rpx;
	border: 1rpx dashed #c5e1a5;
}
.stroke-p-title { display: block; font-size: 24rpx; font-weight: 700; color: #558b2f; margin-bottom: 8rpx; }
.stroke-p-glyphs { display: block; font-size: 30rpx; color: #2c2419; margin-bottom: 6rpx; word-break: break-all; }
.stroke-p-names { display: block; font-size: 24rpx; color: #5d4037; line-height: 1.4; }
.explain-panel {
	margin-bottom: 14rpx;
	padding: 14rpx;
	background: #fce4ec;
	border-radius: 10rpx;
}
.explain-p-title { display: block; font-size: 24rpx; font-weight: 700; color: #880e4f; margin-bottom: 8rpx; }
.explain-p-body { display: block; font-size: 26rpx; color: #4e4e4e; line-height: 1.5; }
.meta-label { display: block; font-size: 20rpx; color: #8a8279; }
.meta-value { display: block; margin-top: 4rpx; font-size: 26rpx; color: #2c2419; font-weight: 600; }
.words-title { display: block; font-size: 24rpx; color: #6b6560; margin-bottom: 6rpx; }
.words { display: block; font-size: 26rpx; color: #2c2419; margin-bottom: 16rpx; line-height: 1.5; }
.actions { display: flex; flex-direction: row; flex-wrap: wrap; margin: -6rpx; }
.actions > button { margin: 6rpx; }
.tags { display: flex; flex-direction: row; flex-wrap: wrap; margin: 8rpx -5rpx 12rpx; }
.tags > .tag { margin: 5rpx; }
.tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: #fff1d4; font-size: 24rpx; color: #6a5120; }
</style>
