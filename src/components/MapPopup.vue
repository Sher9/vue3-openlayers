<template>
  <div 
    class="map-popup" 
    v-show="visible && isValidPosition" 
    :style="popupStyle"
  >
    <div class="popup-content">
      <div class="popup-header">
        <span class="title">位置信息</span>
        <span class="close-btn" @click="handleClose">×</span>
      </div>
      <div class="popup-body">
        <div class="coordinate-info">
          <p>经度：{{ pointData?.longitude.toFixed(6) }}</p>
          <p>纬度：{{ pointData?.latitude.toFixed(6) }}</p>
        </div>
        <div class="data-info">
          <div class="info-item">
            <span class="label">区域：</span>
            <span class="value">{{ pointData?.area || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">类型：</span>
            <span class="value">{{ pointData?.type || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态：</span>
            <span class="value" :class="pointData?.status">
              {{ pointData?.status || '未知' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="popup-arrow"></div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Array,
    default: () => [0, 0]
  },
  pointData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const left = ref(0)
const top = ref(0)

// 检查位置是否有效
const isValidPosition = computed(() => {
  return props.position && 
         Array.isArray(props.position) && 
         props.position.length === 2 &&
         !isNaN(props.position[0]) && 
         !isNaN(props.position[1])
})

// 计算弹框样式
const popupStyle = computed(() => {
  if (!isValidPosition.value) return {}
  
  return {
    left: `${props.position[0]}px`,
    top: `${props.position[1] - 20}px`, // 上移20像素，为箭头留出空间
    opacity: props.visible ? 1 : 0,
    transform: `translate(-50%, -100%) scale(${props.visible ? 1 : 0.8})`,
    transition: 'all 0.3s ease'
  }
})

// 处理关闭事件
const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.map-popup {
  position: absolute;
  z-index: 1000;
  pointer-events: auto;
  will-change: transform;
}

.popup-content {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  min-width: 200px;
  overflow: hidden;
  transform-origin: bottom center;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.popup-header {
  padding: 8px 12px;
  background: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
}

.title {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.close-btn {
  cursor: pointer;
  font-size: 20px;
  color: #666;
  line-height: 1;
  padding: 0 4px;
}

.close-btn:hover {
  color: #333;
}

.popup-body {
  padding: 12px;
}

.coordinate-info {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}

.coordinate-info p {
  margin: 4px 0;
  color: #666;
  font-size: 12px;
}

.data-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
  color: #333;
}

.value.active {
  color: #4CAF50;
}

.value.inactive {
  color: #F44336;
}

.popup-arrow {
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(255, 255, 255, 0.95);
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
  transition: opacity 0.3s ease;
}

/* 添加动画效果 */
.map-popup-enter-active,
.map-popup-leave-active {
  transition: all 0.3s ease;
}

.map-popup-enter-from,
.map-popup-leave-to {
  opacity: 0;
  transform: translate(-50%, -100%) scale(0.8);
}
</style> 