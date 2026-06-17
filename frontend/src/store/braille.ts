import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { BRAILLE_MAP, textToBraille, brailleToText, dotsToUnicode } from '../utils/braille'
import type { LearnMode, DailyRecord, WeakItem, WeeklyData } from '../types'

const STORAGE_KEY = 'braille-stats'

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch (e) {}
  return null
}

function saveToStorage(data: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {}
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useBrailleStore = defineStore('braille', () => {
  const inputText = ref('')
  const brailleOutput = ref<number[][]>([])
  const learnMode = ref<LearnMode>('charToBraille')
  const quizChar = ref('')
  const selectedDots = ref<number[]>([])
  const score = ref({ correct: 0, total: 0 })
  const history = ref<{ input: string; correct: boolean }[]>([])
  const dailyRecords = ref<DailyRecord[]>([])
  const charStats = ref<Record<string, { correct: number; wrong: number }>>({})
  const practiceStartTime = ref<number | null>(null)
  const todayAccumulatedMinutes = ref(0)

  const brailleUnicode = computed(() =>
    brailleOutput.value.map(d => dotsToUnicode(d)).join('')
  )

  function translate() {
    brailleOutput.value = textToBraille(inputText.value)
  }

  function reverseTranslate() {
    // Simple: take selectedDots and find matching char
    return brailleToText(selectedDots.value)
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    selectedDots.value = []
  }

  function toggleDot(dot: number) {
    const idx = selectedDots.value.indexOf(dot)
    if (idx >= 0) selectedDots.value.splice(idx, 1)
    else selectedDots.value.push(dot)
  }

  function initStats() {
    const saved = loadFromStorage()
    if (saved) {
      dailyRecords.value = saved.dailyRecords || []
      charStats.value = saved.charStats || {}
      todayAccumulatedMinutes.value = saved.todayAccumulatedMinutes || 0
    }
    const today = getTodayStr()
    const todayRecord = dailyRecords.value.find(r => r.date === today)
    if (!todayRecord) {
      dailyRecords.value.push({
        date: today,
        practiceMinutes: 0,
        correct: 0,
        total: 0
      })
    }
  }

  function saveStats() {
    saveToStorage({
      dailyRecords: dailyRecords.value,
      charStats: charStats.value,
      todayAccumulatedMinutes: todayAccumulatedMinutes.value
    })
  }

  function updateDailyRecord(correct: boolean) {
    const today = getTodayStr()
    let record = dailyRecords.value.find(r => r.date === today)
    if (!record) {
      record = { date: today, practiceMinutes: 0, correct: 0, total: 0 }
      dailyRecords.value.push(record)
    }
    record.total++
    if (correct) record.correct++
  }

  function updateCharStats(char: string, correct: boolean) {
    if (!charStats.value[char]) {
      charStats.value[char] = { correct: 0, wrong: 0 }
    }
    if (correct) {
      charStats.value[char].correct++
    } else {
      charStats.value[char].wrong++
    }
  }

  function startPractice() {
    practiceStartTime.value = Date.now()
  }

  function stopPractice() {
    if (practiceStartTime.value) {
      const elapsed = Math.floor((Date.now() - practiceStartTime.value) / 60000)
      if (elapsed > 0) {
        todayAccumulatedMinutes.value += elapsed
        const today = getTodayStr()
        let record = dailyRecords.value.find(r => r.date === today)
        if (!record) {
          record = { date: today, practiceMinutes: 0, correct: 0, total: 0 }
          dailyRecords.value.push(record)
        }
        record.practiceMinutes += elapsed
        saveStats()
      }
      practiceStartTime.value = null
    }
  }

  function getWeeklyData(): WeeklyData {
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    weekAgo.setHours(0, 0, 0, 0)

    const dailyData: DailyRecord[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const record = dailyRecords.value.find(r => r.date === dateStr)
      dailyData.push(record || { date: dateStr, practiceMinutes: 0, correct: 0, total: 0 })
    }

    const totalMinutes = dailyData.reduce((sum, r) => sum + r.practiceMinutes, 0)
    const totalCorrect = dailyData.reduce((sum, r) => sum + r.correct, 0)
    const totalQuestions = dailyData.reduce((sum, r) => sum + r.total, 0)
    const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0

    const firstHalf = dailyData.slice(0, 3)
    const secondHalf = dailyData.slice(3)
    const firstCorrect = firstHalf.reduce((s, r) => s + r.correct, 0)
    const firstTotal = firstHalf.reduce((s, r) => s + r.total, 0)
    const secondCorrect = secondHalf.reduce((s, r) => s + r.correct, 0)
    const secondTotal = secondHalf.reduce((s, r) => s + r.total, 0)
    const firstAcc = firstTotal > 0 ? firstCorrect / firstTotal : 0
    const secondAcc = secondTotal > 0 ? secondCorrect / secondTotal : 0
    const accuracyChange = firstTotal > 0 && secondTotal > 0 ? (secondAcc - firstAcc) * 100 : 0

    const weakItems: WeakItem[] = Object.entries(charStats.value)
      .map(([char, stats]) => {
        const totalCount = stats.correct + stats.wrong
        return {
          char,
          wrongCount: stats.wrong,
          totalCount,
          accuracy: totalCount > 0 ? stats.correct / totalCount : 1
        }
      })
      .filter(item => item.totalCount >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)

    return {
      totalMinutes,
      totalCorrect,
      totalQuestions,
      accuracy: accuracy * 100,
      accuracyChange,
      dailyRecords: dailyData,
      weakItems
    }
  }

  function checkQuizAnswer() {
    const correct = JSON.stringify([...selectedDots.value].sort()) === JSON.stringify([...(BRAILLE_MAP[quizChar.value] || [])].sort())
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({ input: quizChar.value, correct })
    updateDailyRecord(correct)
    updateCharStats(quizChar.value, correct)
    saveStats()
    if (navigator.vibrate) navigator.vibrate(correct ? 100 : [100, 50, 100])
    generateQuiz()
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  function resetAllStats() {
    dailyRecords.value = []
    charStats.value = {}
    todayAccumulatedMinutes.value = 0
    score.value = { correct: 0, total: 0 }
    history.value = []
    saveStats()
  }

  function exportPDF(): string {
    const lines = inputText.value.toUpperCase().split('')
    let out = '盲文翻译输出\n\n'
    for (const ch of lines) {
      const dots = BRAILLE_MAP[ch] || []
      out += `${ch} → [${dots.join(',')}] ${dotsToUnicode(dots)}\n`
    }
    return out
  }

  return {
    inputText, brailleOutput, learnMode, quizChar, selectedDots, score, history,
    dailyRecords, charStats, practiceStartTime, todayAccumulatedMinutes,
    brailleUnicode, translate, reverseTranslate, generateQuiz, toggleDot,
    checkQuizAnswer, resetScore, resetAllStats, exportPDF,
    initStats, startPractice, stopPractice, getWeeklyData
  }
})
