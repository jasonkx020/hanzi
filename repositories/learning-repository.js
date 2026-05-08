import {
	addCharWrongCount,
	markCharLearned,
	listLearnedChars,
	listWrongOftenChars
} from '@/utils/user-progress-storage.js'

export function recordCharWrong(hanzi, delta = 1, dims) {
	return addCharWrongCount(hanzi, delta, dims)
}

export function recordCharLearned(hanzi, dims) {
	return markCharLearned(hanzi, dims)
}

export function getLearnedChars() {
	return listLearnedChars()
}

export function getWrongChars() {
	return listWrongOftenChars()
}
