/**
 * @file constants.js
 * @module utils
 * @description 基础设施工具：constants.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/** 四声元数据（儿童 UI：轮廓 + 颜色 + 口语标签） */
export const TONE_LEVELS = [
	{ id: 1, key: 'ear', title: '四声耳朵', emoji: '👂', subtitle: '听一听，选对的形状' },
	{ id: 2, key: 'body', title: '四声身体', emoji: '🙋', subtitle: '听音做动作，身体记住调' },
	{ id: 3, key: 'match', title: '调号朋友', emoji: '🤝', subtitle: '形状和拼音配一对' },
	{ id: 4, key: 'mark', title: '标调魔法', emoji: '✨', subtitle: '调号标在哪个字母上' },
	{ id: 5, key: 'words', title: '四声词语', emoji: '📖', subtitle: '同一个音，不同意思' }
]

/** 关 2：四声身体动作（儿童跟做） */
export const TONE_BODY_GESTURES = [
	{ tone: 1, emoji: '🤚', gesture: '手臂平平', tip: '像画一条直线' },
	{ tone: 2, emoji: '✋', gesture: '手往上抬', tip: '尾巴往上扬' },
	{ tone: 3, emoji: '🫳', gesture: '先低再拐弯', tip: '像个小山谷' },
	{ tone: 4, emoji: '👇', gesture: '手往下落', tip: '像滑滑梯' }
]

export const TONE_META = [
	{ tone: 1, label: '一声', kidLabel: '平平的', symbol: '→', color: '#5B9BD5' },
	{ tone: 2, label: '二声', kidLabel: '往上扬', symbol: '↑', color: '#70AD47' },
	{ tone: 3, label: '三声', kidLabel: '拐弯', symbol: '∨', color: '#FFC000' },
	{ tone: 4, label: '四声', kidLabel: '往下落', symbol: '↓', color: '#ED7D31' }
]

/** P0 听辨 / 配对用的音节池（单韵母 + 常见音节） */
export const TONE_LAB_SYLLABLE_POOL = ['a', 'o', 'e', 'i', 'u', 'ü', 'ma', 'ba', 'da', 'mi']

export const TONE_COLUMN_LABELS = ['一声', '二声', '三声', '四声']

export const EAR_QUIZ_TOTAL = 8
export const EAR_QUIZ_PASS = 6
export const MATCH_QUIZ_TOTAL = 6
export const MATCH_QUIZ_PASS = 5
export const BODY_QUIZ_TOTAL = 8
export const BODY_QUIZ_PASS = 6
export const WORDS_QUIZ_TOTAL = 6
export const WORDS_QUIZ_PASS = 5
export const MARK_QUIZ_TOTAL = 8
export const MARK_QUIZ_PASS = 6

export const STORAGE_KEY_TONE_LAB = 'tone_lab_progress_v1'
