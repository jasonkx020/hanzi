/**
 * @file constants.js
 * @module utils
 * @description 基础设施工具：constants.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/** 声母乐园关卡 */
export const INITIAL_LEVELS = [
	{ id: 1, key: 'ear', title: '声母耳朵', emoji: '👂', subtitle: '听一听，点对的声母' },
	{ id: 2, key: 'mouth', title: '口型朋友', emoji: '👄', subtitle: '看口型提示，选出声母' },
	{ id: 3, key: 'group', title: '同组小能手', emoji: '🤝', subtitle: '同一组里听音辨认' },
	{ id: 4, key: 'drill', title: '大闯关', emoji: '🎯', subtitle: '拼音大闯关·声母专练', isLink: true }
]

export const INITIAL_EAR_QUIZ_TOTAL = 8
export const INITIAL_EAR_QUIZ_PASS = 6
export const INITIAL_MOUTH_QUIZ_TOTAL = 8
export const INITIAL_MOUTH_QUIZ_PASS = 6
export const INITIAL_GROUP_QUIZ_TOTAL = 6
export const INITIAL_GROUP_QUIZ_PASS = 5

export const STORAGE_KEY_INITIAL_LAB = 'initial_lab_progress_v1'
