<template>
  <div class="geojson-control">
    <input 
      type="file" 
      accept=".json,.geojson" 
      ref="fileInput"
      @change="handleFileUpload"
      style="display: none"
    >
    <div class="button-group">
      <button @click="$refs.fileInput.click()">
        加载 GeoJSON
      </button>
      <button 
        v-if="hasGeoJSON"
        @click="clearGeoJSON"
        class="clear-btn"
      >
        清除 GeoJSON
      </button>
    </div>
    <div v-if="hasGeoJSON" class="layer-info">
      <h4>图层信息</h4>
      <p>要素数量: {{ featureCount }}</p>
      <div class="style-controls">
        <label>
          填充颜色:
          <input type="color" v-model="fillColor" @change="updateStyle">
        </label>
        <label>
          边框颜色:
          <input type="color" v-model="strokeColor" @change="updateStyle">
        </label>
        <label>
          透明度:
          <input 
            type="range" 
            v-model="opacity" 
            min="0" 
            max="1" 
            step="0.1"
            @input="updateStyle"
          >
          {{ opacity }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMapStore } from '../stores/map'
import GeoJSON from 'ol/format/GeoJSON'

const mapStore = useMapStore()
const fileInput = ref(null)
const fillColor = ref('#3388ff')
const strokeColor = ref('#ffffff')
const opacity = ref(0.5)
const featureCount = ref(0)

const hasGeoJSON = computed(() => featureCount.value > 0)

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const text = await file.text()
    const geojson = JSON.parse(text)
    mapStore.loadGeoJSON(geojson, {
      fill: fillColor.value,
      stroke: strokeColor.value,
      opacity: opacity.value
    })
    featureCount.value = mapStore.getGeoJSONFeatureCount()
  } catch (error) {
    console.error('Error loading GeoJSON:', error)
    alert('加载 GeoJSON 文件失败')
  }
}

const updateStyle = () => {
  mapStore.updateGeoJSONStyle({
    fill: fillColor.value,
    stroke: strokeColor.value,
    opacity: opacity.value
  })
}

const clearGeoJSON = () => {
  mapStore.clearGeoJSON()
  featureCount.value = 0
}
</script>

<style scoped>
.geojson-control {
  position: fixed;
  left: 20px;
  bottom: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  z-index: 1000;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

button {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-btn {
  background: #f44336;
}

.layer-info {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.style-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

input[type="color"] {
  width: 50px;
  height: 25px;
  padding: 0;
  border: none;
  border-radius: 4px;
}

input[type="range"] {
  flex: 1;
}
</style> 