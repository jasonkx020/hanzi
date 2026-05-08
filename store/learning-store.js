import { getLearnedChars, getWrongChars } from '@/repositories/learning-repository.js'

const learningState = {
	learnedCount: 0,
	wrongCount: 0
}

export function refreshLearningState() {
	learningState.learnedCount = getLearnedChars().length
	learningState.wrongCount = getWrongChars().length
	return learningState
}

export function getLearningState() {
	return learningState
}
