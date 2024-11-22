<template>
  <div class="static-chart-container" v-show="props.pointData">
    <div class="chart-header">
      <span class="title">点位数据</span>
      <span class="coordinates" v-if="props.pointData">
        经度: {{ props.pointData.longitude.toFixed(6) }}
        纬度: {{ props.pointData.latitude.toFixed(6) }}
      </span>
    </div>
    <div class="chart-content" ref="chartContainer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  pointData: {
    type: Object,
    default: null
  }
})

const chartContainer = ref(null)
const chart = ref(null)

const initChart = () => {
  if (!chartContainer.value || !props.pointData) return
  
  chart.value = echarts.init(chartContainer.value)
  
  const option = {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    title: {
      text: '点位实时数据',
      textStyle: {
        fontSize: 14,
        color: '#333'
      },
      padding: [10, 15]
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['访问量', '订单量'],
      top: 10,
      right: 10,
      textStyle: {
        color: '#666'
      }
    },
    grid: {
      top: 50,
      right: 20,
      bottom: 20,
      left: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      axisLabel: {
        fontSize: 10,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0,0,0,0.1)'
        }
      }
    },
    series: [
      {
        name: '访问量',
        type: 'bar',
        data: props.pointData?.data || [],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(51,136,255,0.8)' },
            { offset: 1, color: 'rgba(51,136,255,0.3)' }
          ])
        }
      }
    ]
  }
  
  chart.value.setOption(option)
}

// 监听数据变化
watch(() => props.pointData, (newVal) => {
  if (newVal) {
    if (!chart.value) {
      initChart()
    } else {
      chart.value.setOption({
        series: [{
          data: newVal.data
        }]
      })
    }
  }
}, { deep: true })

// 添加窗口大小变化监听
const handleResize = () => {
  if (chart.value) {
    chart.value.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart.value) {
    chart.value.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.static-chart-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
}

.chart-header {
  padding: 10px 15px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: bold;
  color: #333;
}

.coordinates {
  font-size: 12px;
  color: #666;
}

.chart-content {
  width: 400px;
  height: 250px;
  padding: 10px;
}
</style> 