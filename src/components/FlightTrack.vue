<template>
  <div class="flight-control">
    <button @click="startAnimation" :disabled="isAnimating">
      开始飞行
    </button>
    <button @click="stopAnimation" :disabled="!isAnimating">
      停止飞行
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '../stores/map'
import { Feature } from 'ol'
import { Point, LineString } from 'ol/geom'
import { Style, Stroke, Icon } from 'ol/style'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { transform } from 'ol/proj'
import { easeOut } from 'ol/easing'

const mapStore = useMapStore()
const isAnimating = ref(false)
const flightLayer = ref(null)
const flightSource = ref(null)
const plane = ref(null)
let animationFrameId = null

// 简化为单一航线：北京 -> 上海
const flightPath = {
  coords: [
    [116.397428, 39.90923],  // 北京
    [121.473701, 31.230416]  // 上海
  ]
}

// 初始化飞行图层
const initFlightLayer = () => {
  if (!mapStore.map) return

  flightSource.value = new VectorSource()
  flightLayer.value = new VectorLayer({
    source: flightSource.value,
    style: (feature) => {
      if (feature.get('type') === 'route') {
        return new Style({
          stroke: new Stroke({
            color: '#a6c84c',
            width: 3,
            lineDash: [6, 6]
          })
        })
      } else {
        return new Style({
          image: new Icon({
            src: '/plane.png',
            scale: 0.5,
            rotation: feature.get('rotation') || 0,
            anchor: [0.5, 0.5],
            rotateWithView: false
          })
        })
      }
    }
  })

  mapStore.map.addLayer(flightLayer.value)
}

// 创建航线和飞机
const createFlight = () => {
  // 转换坐标
  const coords = flightPath.coords.map(coord => 
    transform(coord, 'EPSG:4326', 'EPSG:3857')
  )

  // 添加航线
  const routeFeature = new Feature({
    geometry: new LineString(coords),
    type: 'route'
  })
  flightSource.value.addFeature(routeFeature)

  // 添加飞机
  const planeFeature = new Feature({
    geometry: new Point(coords[0]),
    type: 'plane'
  })
  flightSource.value.addFeature(planeFeature)
  plane.value = {
    feature: planeFeature,
    coords: coords,
    progress: 0
  }

  // 缩放到航线范围
  mapStore.map.getView().fit(routeFeature.getGeometry().getExtent(), {
    padding: [100, 100, 100, 100],
    duration: 1000
  })
}

// 开始动画
const startAnimation = () => {
  if (isAnimating.value) return
  
  isAnimating.value = true
  const start = Date.now()
  const duration = 10000 // 10秒完成一次飞行

  const animate = () => {
    if (!isAnimating.value) {
      // 停止时回到起点
      const startCoord = plane.value.coords[0]
      plane.value.feature.getGeometry().setCoordinates(startCoord)
      return
    }

    const elapsed = Date.now() - start
    const phase = (elapsed % duration) / duration

    const line = new LineString(plane.value.coords)
    const point = line.getCoordinateAt(phase)
    
    // 计算飞机朝向
    const nextPoint = line.getCoordinateAt(Math.min(phase + 0.01, 1))
    const dx = nextPoint[0] - point[0]
    const dy = nextPoint[1] - point[1]
    const rotation = Math.atan2(dy, dx)

    plane.value.feature.setStyle(
      new Style({
        image: new Icon({
          src: '/plane.png',
          scale: 0.5,
          rotation: rotation,
          anchor: [0.5, 0.5],
          rotateWithView: false
        })
      })
    )

    plane.value.feature.getGeometry().setCoordinates(point)

    mapStore.map.render()
    animationFrameId = requestAnimationFrame(animate)
  }

  animate()
}

// 停止动画
const stopAnimation = () => {
  isAnimating.value = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

onMounted(() => {
  // 等待地图初始化完成
  const checkMap = setInterval(() => {
    if (mapStore.map) {
      clearInterval(checkMap)
      initFlightLayer()
      createFlight()
    }
  }, 100)
})

onUnmounted(() => {
  stopAnimation()
  if (flightLayer.value && mapStore.map) {
    mapStore.map.removeLayer(flightLayer.value)
  }
})
</script>

<style scoped>
.flight-control {
  position: fixed;
  left: 20px;
  bottom: 100px;
  z-index: 1000;
  display: flex;
  gap: 10px;
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

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
</style> 