<template>
  <div class="min-h-screen p-4 flex flex-col gap-4 max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-purple-400">盲文翻译与触觉学习器</h1>

    <div class="flex gap-2 flex-wrap">
      <button v-for="t in tabs" :key="t.id" @click="handleTabChange(t.id)"
        class="px-4 py-2 rounded text-sm"
        :class="activeTab === t.id ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'">
        {{ t.label }}
      </button>
    </div>

    <!-- Translate -->
    <div v-if="activeTab === 'translate'" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">文本输入</h3>
        <textarea v-model="store.inputText" @input="store.translate()"
          class="w-full h-32 bg-gray-800 rounded p-3 text-white resize-none" placeholder="输入英文文本..." />
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="text-purple-300 font-bold mb-2">盲文输出</h3>
        <div class="text-4xl tracking-wider text-purple-300 h-16">{{ store.brailleUnicode }}</div>
        <div class="flex flex-wrap gap-2 mt-3">
          <BrailleCell v-for="(dots, i) in store.brailleOutput" :key="i" :dots="dots" :size="40" />
        </div>
      </div>
    </div>

    <!-- Learn -->
    <div v-if="activeTab === 'learn'" class="grid grid-cols-2 gap-4">
      <div class="bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-4">
        <h3 class="text-purple-300 font-bold">猜盲文</h3>
        <div v-if="!store.quizChar">
          <button @click="store.generateQuiz()" class="bg-purple-500 px-6 py-3 rounded-lg text-lg hover:bg-purple-400">
            开始训练
          </button>
        </div>
        <div v-else class="flex flex-col items-center gap-3">
          <div class="text-7xl font-bold text-purple-400">{{ store.quizChar }}</div>
          <div class="text-sm text-gray-400">点击下方 6 点阵选择对应盲文</div>
          <div class="grid grid-cols-2 gap-2 p-4 bg-gray-800 rounded-xl">
            <button v-for="d in 6" :key="d" @click="store.toggleDot(d)"
              class="w-14 h-14 rounded-full border-2 transition-all"
              :class="store.selectedDots.includes(d) ? 'bg-purple-500 border-purple-400 scale-110' : 'bg-gray-700 border-gray-600 hover:border-purple-400'">
              <span class="text-xs">{{ d }}</span>
            </button>
          </div>
          <button @click="store.checkQuizAnswer()" class="bg-purple-500 px-6 py-2 rounded hover:bg-purple-400">确认</button>
        </div>
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between mb-2">
          <h3 class="text-purple-300 font-bold">统计</h3>
          <button @click="store.resetScore()" class="text-red-400 text-xs hover:underline">重置</button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-green-400">{{ store.score.correct }}</div>
            <div class="text-xs text-gray-400">正确</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-red-400">{{ store.score.total - store.score.correct }}</div>
            <div class="text-xs text-gray-400">错误</div>
          </div>
          <div class="bg-gray-800 rounded p-2">
            <div class="text-2xl font-bold text-purple-400">{{ store.score.total ? Math.round(store.score.correct / store.score.total * 100) : 0 }}%</div>
            <div class="text-xs text-gray-400">正确率</div>
          </div>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div v-for="(h, i) in store.history.slice(0, 20)" :key="i"
            class="flex justify-between bg-gray-800 rounded p-2 text-sm"
            :class="h.correct ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'">
            <span>{{ h.input }}</span><span>{{ h.correct ? '✓' : '✗' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reference -->
    <div v-if="activeTab === 'ref'" class="bg-gray-900 rounded-xl p-4">
      <h3 class="text-purple-300 font-bold mb-3">盲文速查表</h3>
      <div class="grid grid-cols-6 md:grid-cols-9 gap-3">
        <div v-for="(dots, char) in brailleMap" :key="char" class="flex flex-col items-center">
          <div class="text-xl font-bold text-purple-400">{{ char }}</div>
          <BrailleCell :dots="dots" :size="30" />
          <div class="text-xs text-gray-500">{{ dots.join(',') }}</div>
        </div>
      </div>
    </div>

    <!-- Weekly Report -->
    <div v-if="activeTab === 'weekly'" class="flex flex-col gap-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-gray-900 rounded-xl p-4 text-center">
          <div class="text-3xl font-bold text-purple-400">{{ weeklyData.totalMinutes }}</div>
          <div class="text-sm text-gray-400 mt-1">本周练习(分钟)</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-4 text-center">
          <div class="text-3xl font-bold text-green-400">{{ weeklyData.totalQuestions }}</div>
          <div class="text-sm text-gray-400 mt-1">本周答题数</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-4 text-center">
          <div class="text-3xl font-bold text-blue-400">{{ Math.round(weeklyData.accuracy) }}%</div>
          <div class="text-sm text-gray-400 mt-1">本周正确率</div>
        </div>
        <div class="bg-gray-900 rounded-xl p-4 text-center">
          <div class="text-3xl font-bold" :class="weeklyData.accuracyChange >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ weeklyData.accuracyChange >= 0 ? '+' : '' }}{{ weeklyData.accuracyChange.toFixed(1) }}%
          </div>
          <div class="text-sm text-gray-400 mt-1">正确率变化</div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-purple-300 font-bold">每日练习时长</h3>
          <span class="text-xs text-gray-500">近7天</span>
        </div>
        <div class="flex items-end justify-between gap-2 h-40">
          <div v-for="(day, i) in weeklyData.dailyRecords" :key="i" class="flex-1 flex flex-col items-center gap-2">
            <div class="w-full bg-gray-800 rounded-t relative flex items-end" style="height: 120px;">
              <div class="w-full bg-purple-500 rounded-t transition-all"
                :style="{ height: maxMinutes > 0 ? (day.practiceMinutes / maxMinutes * 100) + '%' : '0%' }"></div>
            </div>
            <div class="text-xs text-gray-500">{{ formatDayLabel(day.date) }}</div>
            <div class="text-xs text-purple-400">{{ day.practiceMinutes }}分</div>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-purple-300 font-bold">每日正确率</h3>
          <span class="text-xs text-gray-500">近7天</span>
        </div>
        <div class="flex items-end justify-between gap-2 h-40">
          <div v-for="(day, i) in weeklyData.dailyRecords" :key="i" class="flex-1 flex flex-col items-center gap-2">
            <div class="w-full bg-gray-800 rounded-t relative flex items-end" style="height: 120px;">
              <div class="w-full rounded-t transition-all"
                :class="getDayAccuracy(day) >= 60 ? 'bg-green-500' : 'bg-yellow-500'"
                :style="{ height: getDayAccuracy(day) + '%' }"></div>
            </div>
            <div class="text-xs text-gray-500">{{ formatDayLabel(day.date) }}</div>
            <div class="text-xs" :class="getDayAccuracy(day) >= 60 ? 'text-green-400' : 'text-yellow-400'">
              {{ getDayAccuracy(day).toFixed(0) }}%
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 rounded-xl p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-purple-300 font-bold">最近薄弱项</h3>
          <button @click="store.resetAllStats()" class="text-red-400 text-xs hover:underline">重置全部数据</button>
        </div>
        <div v-if="weeklyData.weakItems.length === 0" class="text-gray-500 text-center py-8">
          暂无数据，多练习几次后再来查看吧~
        </div>
        <div v-else class="space-y-3">
          <div v-for="(item, i) in weeklyData.weakItems" :key="i"
            class="flex items-center gap-4 bg-gray-800 rounded-lg p-3">
            <div class="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center text-xl font-bold text-red-400">
              {{ item.char }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between text-sm mb-1">
                <span class="text-gray-300">正确率 {{ (item.accuracy * 100).toFixed(0) }}%</span>
                <span class="text-gray-500">共 {{ item.totalCount }} 次，错 {{ item.wrongCount }} 次</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-2">
                <div class="bg-red-500 h-2 rounded-full transition-all"
                  :style="{ width: (item.accuracy * 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button v-if="activeTab === 'translate'" @click="doExport" class="bg-green-700 px-4 py-2 rounded self-start hover:bg-green-600 text-sm">
      导出翻译文本
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useBrailleStore } from './store/braille'
import { BRAILLE_MAP } from './utils/braille'
import BrailleCell from './components/BrailleCell.vue'
import type { DailyRecord } from './types'

const store = useBrailleStore()
const brailleMap = BRAILLE_MAP
const tabs = [
  { id: 'translate', label: '翻译模式' },
  { id: 'learn', label: '训练模式' },
  { id: 'ref', label: '速查表' },
  { id: 'weekly', label: '学习周报' },
]
const activeTab = ref('translate')

const weeklyData = computed(() => store.getWeeklyData())

const maxMinutes = computed(() => {
  const max = Math.max(...weeklyData.value.dailyRecords.map(r => r.practiceMinutes))
  return max > 0 ? max : 1
})

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getDayAccuracy(day: DailyRecord): number {
  if (day.total === 0) return 0
  return (day.correct / day.total) * 100
}

function handleTabChange(tabId: string) {
  if (activeTab.value === 'learn' && tabId !== 'learn') {
    store.stopPractice()
  }
  if (tabId === 'learn' && activeTab.value !== 'learn') {
    store.startPractice()
  }
  activeTab.value = tabId
}

function doExport() {
  const text = store.exportPDF()
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'braille-output.txt'
  a.click()
}

onMounted(() => {
  store.initStats()
})

onBeforeUnmount(() => {
  store.stopPractice()
})
</script>
