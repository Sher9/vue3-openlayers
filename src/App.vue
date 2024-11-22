<template>
  <div class="app-container">
    <div id="map" class="map-container">
      <StaticChart :point-data="mapStore.currentPointData" />
      <GeoJsonLayer />
      <MapPopup
        :visible="mapStore.popupVisible"
        :position="mapStore.popupPosition"
        :point-data="mapStore.popupData"
        @close="mapStore.closePopup"
      />
      <FlightTrack v-if="currentMode === 'flight'" />
    </div>
    <div class="control-panel">
      <div class="mode-selector">
        <h3>功能选择：</h3>
        <div class="button-group">
          <button 
            @click="switchMode('point')" 
            :class="{ active: currentMode === 'point' }"
          >
            点位标记
          </button>
          <button 
            @click="switchMode('route')" 
            :class="{ active: currentMode === 'route' }"
          >
            路线规划
          </button>
          <button 
            @click="switchMode('heatmap')" 
            :class="{ active: currentMode === 'heatmap' }"
          >
            热力图
          </button>
          <button 
            @click="switchMode('boxSelect')" 
            :class="{ active: currentMode === 'boxSelect' }"
          >
            框选工具
          </button>
          <button 
            @click="switchMode('cluster')" 
            :class="{ active: currentMode === 'cluster' }"
          >
            聚合显示
          </button>
          <button 
            @click="switchMode('flight')" 
            :class="{ active: currentMode === 'flight' }"
          >
            飞行轨迹
          </button>
        </div>
      </div>
      <div class="info-panel" v-if="mapStore.selectedPoint && currentMode === 'point'">
        <h3>选中的坐标点：</h3>
        <p>经度：{{ mapStore.selectedPoint.longitude.toFixed(6) }}</p>
        <p>纬度：{{ mapStore.selectedPoint.latitude.toFixed(6) }}</p>
      </div>
      <div class="info-panel" v-if="currentMode === 'route'">
        <h3>路线规划：</h3>
        <p v-if="mapStore.routePoints.start">起点已标记</p>
        <p v-if="mapStore.routePoints.end">终点已标记</p>
        <div v-if="mapStore.routeFeature" class="rider-controls">
          <button 
            @click="mapStore.startAnimation()"
            :disabled="mapStore.isRiderMoving"
            class="rider-button"
          >
            开始配送
          </button>
          <button 
            @click="mapStore.stopAnimation()"
            :disabled="!mapStore.isRiderMoving"
            class="rider-button stop"
          >
            停止配送
          </button>
        </div>
      </div>
      <div class="info-panel" v-if="currentMode === 'heatmap'">
        <h3>热力图设置：</h3>
        <div class="slider-group">
          <label>
            模糊度：
            <input 
              type="range" 
              v-model="heatmapBlur" 
              min="1" 
              max="50"
              @input="updateHeatmap"
            >
            {{ heatmapBlur }}
          </label>
          <label>
            半径：
            <input 
              type="range" 
              v-model="heatmapRadius" 
              min="1" 
              max="30"
              @input="updateHeatmap"
            >
            {{ heatmapRadius }}
          </label>
        </div>
      </div>
      <div class="info-panel" v-if="mapStore.selectedArea && currentMode === 'boxSelect'">
        <h3>框选区域：</h3>
        <p>选中点位数：{{ mapStore.selectedArea.count }}</p>
      </div>
      <div class="info-panel" v-if="currentMode === 'cluster'">
        <h3>聚合设置：</h3>
        <div class="cluster-controls">
          <label class="switch">
            <input 
              type="checkbox" 
              v-model="isClusterEnabled"
              @change="toggleCluster"
            >
            <span class="slider round"></span>
            启用聚合
          </label>
          <div class="slider-group" v-if="isClusterEnabled">
            <label>
              聚合距离：
              <input 
                type="range" 
                v-model="clusterDistance" 
                min="20" 
                max="100"
                @input="updateClusterDistance"
              >
              {{ clusterDistance }}px
            </label>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button 
          v-if="currentMode === 'boxSelect' && mapStore.selectedArea"
          @click="mapStore.clearSelection"
        >
          清除框选
        </button>
        <button 
          v-if="currentMode === 'route' && mapStore.routeFeature"
          @click="mapStore.clearRoute"
        >
          清除路线
        </button>
        <button 
          v-if="currentMode === 'heatmap'"
          @click="mapStore.clearHeatmap"
        >
          清除热力图
        </button>
        <button @click="clearAll">清除所有</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from './stores/map'
import StaticChart from './components/StaticChart.vue'
import GeoJsonLayer from './components/GeoJsonLayer.vue'
import MapPopup from './components/MapPopup.vue'
import FlightTrack from './components/FlightTrack.vue'
import 'ol/ol.css'

const mapStore = useMapStore()
const currentMode = ref('point')
const heatmapBlur = ref(15)
const heatmapRadius = ref(10)
const isClusterEnabled = ref(false)
const clusterDistance = ref(40)

const switchMode = (mode) => {
  if (currentMode.value === mode) return
  
  // 清理当前模式
  mapStore.cleanupCurrentMode(currentMode.value)
  
  // 切换到新模式
  currentMode.value = mode
  mapStore.setMode(mode)
}

const updateHeatmap = () => {
  mapStore.updateHeatmapSettings({
    blur: Number(heatmapBlur.value),
    radius: Number(heatmapRadius.value)
  })
}

const clearAll = () => {
  mapStore.clearAll()
  currentMode.value = 'point'
}

const toggleCluster = () => {
  mapStore.toggleCluster(isClusterEnabled.value)
}

const updateClusterDistance = () => {
  mapStore.updateClusterDistance(Number(clusterDistance.value))
}

onMounted(() => {
  setTimeout(() => {
    mapStore.initMap('map')
  }, 0)
})

onUnmounted(() => {
  if (mapStore.map) {
    mapStore.map.setTarget(undefined)
  }
})
</script>

<style>
.app-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 280px;
}

.mode-selector {
  margin-bottom: 20px;
}

.info-panel {
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.button-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background: #45a049;
}

button.active {
  background: #2196F3;
}

button.active:hover {
  background: #1976D2;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slider-group label {
  display: flex;
  align-items: center;
  gap: 10px;
}

input[type="range"] {
  flex: 1;
}

.rider-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.rider-button {
  flex: 1;
  padding: 6px 12px;
  font-size: 14px;
}

.rider-button.stop {
  background: #f44336;
}

.rider-button.stop:hover {
  background: #d32f2f;
}

.rider-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.rider-info-overlay {
  position: relative;
  background: white;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}

.rider-info-overlay::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: white transparent transparent;
}

.rider-info-content {
  text-align: center;
}

.rider-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.order-no {
  color: #666;
  margin-bottom: 2px;
}

.status {
  color: #2196F3;
  font-weight: bold;
}

.status.delivering {
  color: #4CAF50;
}

.status.delivered {
  color: #FF9800;
}

.cluster-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  background-color: #ccc;
  border-radius: 20px;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style> 