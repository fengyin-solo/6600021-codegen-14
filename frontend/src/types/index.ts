export interface BrailleChar {
  char: string
  dots: number[]  // 1-6 active dots
  unicode: string
}

export type LearnMode = 'charToBraille' | 'brailleToChar' | 'dictation'

export interface DailyRecord {
  date: string
  practiceMinutes: number
  correct: number
  total: number
}

export interface WeakItem {
  char: string
  wrongCount: number
  totalCount: number
  accuracy: number
}

export interface WeeklyData {
  totalMinutes: number
  totalCorrect: number
  totalQuestions: number
  accuracy: number
  accuracyChange: number
  dailyRecords: DailyRecord[]
  weakItems: WeakItem[]
}
