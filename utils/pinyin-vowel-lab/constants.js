/**
 * @file constants.js
 * @module utils
 * @description 基础设施工具：constants.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
export const VOWEL_LEVELS = [
	{ id: 1, key: 'ear', title: '韵母耳朵', emoji: '👂', subtitle: '听一听，点对的韵母' },
	{ id: 2, key: 'mouth', title: '发音小贴士', emoji: '💡', subtitle: '看提示，选出韵母' },
	{ id: 3, key: 'group', title: '同组小能手', emoji: '🤝', subtitle: '同一组里听音辨认' },
	{ id: 4, key: 'drill', title: '大闯关', emoji: '🎯', subtitle: '拼音大闯关·韵母专练', isLink: true }
]

export const VOWEL_EAR_QUIZ_TOTAL = 8
export const VOWEL_EAR_QUIZ_PASS = 6
export const VOWEL_MOUTH_QUIZ_TOTAL = 8
export const VOWEL_MOUTH_QUIZ_PASS = 6
export const VOWEL_GROUP_QUIZ_TOTAL = 6
export const VOWEL_GROUP_QUIZ_PASS = 5

export const STORAGE_KEY_VOWEL_LAB = 'vowel_lab_progress_v1'
