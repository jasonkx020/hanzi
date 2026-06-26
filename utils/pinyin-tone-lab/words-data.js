/**
 * @file words-data.js
 * @module utils
 * @description 基础设施工具：words-data.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 关 5：同音节四声词语（儿童漫画卡）
 * playStem 由 applyToneToSyllableStem(bare, tone) 生成
 */
export const TONE_WORD_COMIC_SETS = [
	{
		id: 'ma',
		bare: 'ma',
		title: 'mā · má · mǎ · mà',
		items: [
			{ tone: 1, hanzi: '妈', emoji: '👩', hint: '妈妈' },
			{ tone: 2, hanzi: '麻', emoji: '🌿', hint: '麻花' },
			{ tone: 3, hanzi: '马', emoji: '🐴', hint: '小马' },
			{ tone: 4, hanzi: '骂', emoji: '😤', hint: '骂人（不对哦）' }
		]
	},
	{
		id: 'ba',
		bare: 'ba',
		title: 'bā · bá · bǎ · bà',
		items: [
			{ tone: 1, hanzi: '八', emoji: '8️⃣', hint: '数字八' },
			{ tone: 2, hanzi: '拔', emoji: '🌱', hint: '拔萝卜' },
			{ tone: 3, hanzi: '把', emoji: '🧹', hint: '一把伞' },
			{ tone: 4, hanzi: '爸', emoji: '👨', hint: '爸爸' }
		]
	},
	{
		id: 'da',
		bare: 'da',
		title: 'dā · dá · dǎ · dà',
		items: [
			{ tone: 1, hanzi: '搭', emoji: '🧱', hint: '搭积木' },
			{ tone: 2, hanzi: '答', emoji: '💬', hint: '回答' },
			{ tone: 3, hanzi: '打', emoji: '👋', hint: '打球' },
			{ tone: 4, hanzi: '大', emoji: '🐘', hint: '很大' }
		]
	}
]
