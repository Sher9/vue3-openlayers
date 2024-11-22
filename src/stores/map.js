import { defineStore } from 'pinia'
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { transform } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Feature } from 'ol'
import { Point, LineString, Polygon } from 'ol/geom'
import { Style, Circle, Fill, Stroke, Icon, RegularShape } from 'ol/style'
import Heatmap from 'ol/layer/Heatmap'
import { easeOut } from 'ol/easing'
import Draw from 'ol/interaction/Draw'
import Overlay from 'ol/Overlay'
import AMapLoader from '@amap/amap-jsapi-loader'
import { Cluster } from 'ol/source'
import { Text } from 'ol/style'
import GeoJSON from 'ol/format/GeoJSON'

export const useMapStore = defineStore('map', {
  state: () => ({
    map: null,
    currentMode: 'point',
    vectorSource: null,
    vectorLayer: null,
    selectedPoint: null,
    routeLayer: null,
    routeFeature: null,
    riderFeature: null,
    routePoints: {
      start: null,
      end: null
    },
    heatmapLayer: null,
    heatmapSource: null,
    draw: null,
    selectLayer: null,
    selectedArea: null,
    isDrawing: false,
    startMarker: null,
    endMarker: null,
    isRiderMoving: false,
    riderInfo: {
      name: '骑手小王',
      orderNo: 'DD' + Math.floor(Math.random() * 1000000),
      status: '待配送'
    },
    riderOverlay: null,
    animationFrameId: null,
    amapInstance: null,
    drivingInstance: null,
    clusterSource: null,
    clusterLayer: null,
    isClusterEnabled: false,
    clusterDistance: 40,
    currentPointData: null,
    geoJSONLayer: null,
    geoJSONSource: null,
    popupVisible: false,
    popupPosition: null,
    popupData: null,
    popupCoordinate: null
  }),

  actions: {
    // 初始化高德地图服务
    async initAMap() {
      try {
        window._AMapSecurityConfig = {
          securityJsCode: '3aaee4169e00a91608d2238603d31736',  // 需替换为您的高德地图安全密钥
        }
        
        const AMap = await AMapLoader.load({
          key: '0d9efba776871e81e59ae07add844b20',  // 需要替换为您的高德地图 key
          version: '2.0',
          plugins: ['AMap.Driving']
        })
        
        this.amapInstance = AMap
        this.drivingInstance = new AMap.Driving({
          policy: AMap.DrivingPolicy.LEAST_TIME,
          ferry: 1,
          province: '全国'
        })
      } catch (error) {
        console.error('Init AMap error:', error)
      }
    },

    // 修改 initMap 方法，初始化高德服务
    async initMap(target) {
      try {
        await this.initAMap()
        this.initSources()
        const layers = this.initLayers()
        
        const view = new View({
          center: transform([116.397428, 39.90923], 'EPSG:4326', 'EPSG:3857'),
          zoom: 12,
          maxZoom: 18,
          minZoom: 4
        })

        this.map = new Map({
          target,
          layers,
          view
        })

        this.initMapClick()
        
        if (this.isClusterEnabled) {
          this.startClusterAnimation()
        }
      } catch (error) {
        console.error('Map initialization error:', error)
      }
    },

    initSources() {
      this.vectorSource = new VectorSource()
      this.heatmapSource = new VectorSource()
      
      // 初始化聚合源
      this.clusterSource = new Cluster({
        distance: this.clusterDistance,
        source: this.vectorSource
      })

      this.routeLayer = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          stroke: new Stroke({
            color: '#3388ff',
            width: 4
          })
        })
      })

      // 初始化 GeoJSON 源
      this.geoJSONSource = new VectorSource()
    },

    initLayers() {
      // 基础地图图层
      const baseLayer = new TileLayer({
        source: new XYZ({
          url: 'https://webst0{1-4}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          maxZoom: 18
        })
      })

      // 初始化 GeoJSON 图层
      this.geoJSONLayer = new VectorLayer({
        source: this.geoJSONSource,
        style: new Style({
          fill: new Fill({
            color: 'rgba(51,136,255,0.5)'
          }),
          stroke: new Stroke({
            color: '#ffffff',
            width: 2
          })
        }),
        zIndex: 1
      })

      // 点位图层（现在作为备用）
      this.vectorLayer = new VectorLayer({
        source: this.vectorSource,
        style: new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#ff0000' }),
            stroke: new Stroke({ color: '#ffffff', width: 2 })
          })
        }),
        zIndex: 2,
        visible: !this.isClusterEnabled
      })

      // 聚合图层
      this.clusterLayer = new VectorLayer({
        source: this.clusterSource,
        style: (feature) => {
          const size = feature.get('features').length
          if (size === 1) {
            // 单个点的样式
            return new Style({
              image: new Circle({
                radius: 6,
                fill: new Fill({ color: '#ff0000' }),
                stroke: new Stroke({ color: '#ffffff', width: 2 })
              })
            })
          }

          const styles = []
          
          // 调整基础大小和颜色
          const baseRadius = Math.min(size * 3.5, 25)
          
          // 内层实心圆 - 固定样式，不参与动画
          styles.push(new Style({
            image: new Circle({
              radius: baseRadius,
              fill: new Fill({ color: '#3388ff' }),
              stroke: new Stroke({
                color: '#ffffff',
                width: 2
              })
            })
          }))

          // 数字标签 - 始终显示在最上层
          styles.push(new Style({
            image: new Circle({
              radius: baseRadius,
              fill: new Fill({ color: 'transparent' })  // 透明填充
            }),
            text: new Text({
              text: size.toString(),
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#3388ff', width: 3 }),
              font: 'bold 12px Arial'
            })
          }))

          // 只有外层波纹参与动画
          const maxRadius = baseRadius + 70
          const now = Date.now()
          const duration = 4000
          
          // 添加波纹动画
          for (let i = 0; i < 3; i++) {  // 减少波纹数量到3个
            const phase = ((now % duration) / duration + i * 0.33) % 1
            const easePhase = Math.pow(phase, 2)
            const radius = baseRadius + (maxRadius - baseRadius) * easePhase
            
            // 调整波纹透明度和宽度
            const opacity = Math.max(0, 0.6 * (1 - easePhase))
            
            styles.push(new Style({
              image: new Circle({
                radius: radius,
                fill: new Fill({ color: 'transparent' }),  // 波纹内部透明
                stroke: new Stroke({
                  color: `rgba(51, 136, 255, ${opacity})`,
                  width: Math.max(1, 3 * (1 - easePhase))
                })
              })
            }))
          }

          return styles
        },
        zIndex: 2,
        visible: this.isClusterEnabled,
        updateWhileAnimating: true,
        updateWhileInteracting: true
      })

      // 热力图层
      this.heatmapLayer = new Heatmap({
        source: this.heatmapSource,
        blur: 15,
        radius: 10,
        weight: feature => feature.get('weight'),
        gradient: ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
      })

      // 框选图层
      this.selectLayer = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 2
          })
        }),
        zIndex: 4
      })

      return [baseLayer, this.geoJSONLayer, this.vectorLayer, this.clusterLayer, this.heatmapLayer, this.routeLayer, this.selectLayer]
    },

    initMapClick() {
      this.map.on('click', (evt) => {
        const coordinate = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326')
        const pixel = evt.pixel
        
        switch (this.currentMode) {
          case 'point':
            this.handlePointClick(coordinate, pixel, evt.coordinate)
            break
          case 'route':
            this.handleRoutePoint(coordinate)
            break
          case 'heatmap':
            this.addHeatmapPoint(coordinate)
            break
        }
      })
    },

    handlePointClick(coordinate, pixel, mapCoordinate) {
      this.addPoint(coordinate)
      
      // 生成弹框数据
      this.popupData = {
        longitude: coordinate[0],
        latitude: coordinate[1],
        area: `区域${Math.floor(Math.random() * 10 + 1)}`,
        type: ['商业', '住宅', '工业', '文教'][Math.floor(Math.random() * 4)],
        status: Math.random() > 0.5 ? 'active' : 'inactive'
      }
      
      // 存储实际坐标和像素位置
      this.popupCoordinate = mapCoordinate
      this.updatePopupPosition()
      this.popupVisible = true

      // 添加地图移动和缩放监听
      this.map.on('moveend', this.updatePopupPosition)
    },

    updatePopupPosition() {
      if (this.popupCoordinate && this.popupVisible) {
        const pixel = this.map.getPixelFromCoordinate(this.popupCoordinate)
        if (pixel) {
          this.popupPosition = pixel
        }
      }
    },

    closePopup() {
      this.popupVisible = false
      this.popupData = null
      this.popupCoordinate = null
      // 移除地图监听
      this.map.un('moveend', this.updatePopupPosition)
    },

    setMode(mode) {
      this.currentMode = mode
      if (mode === 'boxSelect') {
        this.startBoxSelect()
      } else if (this.draw) {
        this.stopBoxSelect()
      }
    },

    cleanupCurrentMode(mode) {
      switch (mode) {
        case 'boxSelect':
          this.clearSelection()
          break
        case 'route':
          this.routePoints = { start: null, end: null }
          break
      }
    },

    // 点位功能
    addPoint(coordinate) {
      try {
        const transformedCoord = transform(coordinate, 'EPSG:4326', 'EPSG:3857')
        const feature = new Feature({
          geometry: new Point(transformedCoord)
        })
        
        this.vectorSource.addFeature(feature)
        
        // 生成随机数据并更新当前点位数据
        const data = Array(6).fill(0).map(() => Math.floor(Math.random() * 1000))
        this.currentPointData = {
          longitude: coordinate[0],
          latitude: coordinate[1],
          data: data
        }
        
      } catch (error) {
        console.error('Add point error:', error)
      }
    },

    // 路线功能
    handleRoutePoint(coordinate) {
      if (!this.routePoints.start) {
        this.routePoints.start = coordinate
        this.addStartMarker(coordinate)
      } else if (!this.routePoints.end) {
        this.routePoints.end = coordinate
        this.addEndMarker(coordinate)
        this.addRoute(this.routePoints.start, this.routePoints.end)
      } else {
        this.clearRoute()
        this.routePoints.start = coordinate
        this.addStartMarker(coordinate)
        this.routePoints.end = null
      }
    },

    addStartMarker(coordinate) {
      const transformedCoord = transform(coordinate, 'EPSG:4326', 'EPSG:3857')
      this.startMarker = new Feature({
        geometry: new Point(transformedCoord),
        type: 'start'
      })

      this.startMarker.setStyle(new Style({
        image: new RegularShape({
          points: 3,
          radius: 10,
          fill: new Fill({ color: '#00ff00' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          rotation: Math.PI / -2
        })
      }))

      this.routeLayer.getSource().addFeature(this.startMarker)
    },

    addEndMarker(coordinate) {
      const transformedCoord = transform(coordinate, 'EPSG:4326', 'EPSG:3857')
      this.endMarker = new Feature({
        geometry: new Point(transformedCoord),
        type: 'end'
      })

      this.endMarker.setStyle(new Style({
        image: new RegularShape({
          points: 3,
          radius: 10,
          fill: new Fill({ color: '#ff0000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
          rotation: Math.PI / 2
        })
      }))

      this.routeLayer.getSource().addFeature(this.endMarker)
    },

    // 计算实际道路路线
    async calculateRoute(startPoint, endPoint) {
      if (!this.amapInstance || !this.drivingInstance) {
        console.error('AMap service not initialized')
        return
      }

      return new Promise((resolve, reject) => {
        this.drivingInstance.search(
          new this.amapInstance.LngLat(startPoint[0], startPoint[1]),
          new this.amapInstance.LngLat(endPoint[0], endPoint[1]),
          (status, result) => {
            if (status === 'complete') {
              const path = result.routes[0].steps.reduce((acc, step) => {
                return acc.concat(step.path.map(point => [point.lng, point.lat]))
              }, [])
              resolve(path)
            } else {
              reject(new Error('Route calculation failed'))
            }
          }
        )
      })
    },

    // 修改 addRoute 方法，使用实际道路路线
    async addRoute(startPoint, endPoint) {
      try {
        // 获取实际道路路线
        const routePath = await this.calculateRoute(startPoint, endPoint)
        
        // 转换路线坐标
        const coordinates = routePath.map(point => 
          transform([point[0], point[1]], 'EPSG:4326', 'EPSG:3857')
        )

        // 创建路线要素
        this.routeFeature = new Feature({
          geometry: new LineString(coordinates)
        })

        this.routeFeature.setStyle(new Style({
          stroke: new Stroke({
            color: '#3388ff',
            width: 4,
            lineDash: [8, 4]
          })
        }))

        // 创建骑手要素
        this.riderFeature = new Feature({
          geometry: new Point(coordinates[0])
        })

        this.riderFeature.setStyle(
          new Style({
            image: new Icon({
              src: '/rider.png',
              scale: 0.5,
              anchor: [0.5, 1]
            })
          })
        )

        this.routeLayer.getSource().addFeature(this.routeFeature)
        this.routeLayer.getSource().addFeature(this.riderFeature)

        // 创建骑手信息框
        this.createRiderOverlay(coordinates[0])

        // 调整动画持续时间，使运动更慢
        const routeLength = this.routeFeature.getGeometry().getLength()
        this.animationDuration = Math.min(Math.max(routeLength / 20, 5000), 20000) // 增加基础时间和最大时间

      } catch (error) {
        console.error('Add route error:', error)
        // 如果路线规划失败，回退到直线连接
        const start = transform(startPoint, 'EPSG:4326', 'EPSG:3857')
        const end = transform(endPoint, 'EPSG:4326', 'EPSG:3857')
        
        this.routeFeature = new Feature({
          geometry: new LineString([start, end])
        })
        // ... 其余代码与原来相同
      }
    },

    createRiderOverlay(coordinate) {
      if (this.riderOverlay) {
        this.map.removeOverlay(this.riderOverlay)
      }

      const element = document.createElement('div')
      element.className = 'rider-info-overlay'
      element.innerHTML = `
        <div class="rider-info-content">
          <div class="rider-name">${this.riderInfo.name}</div>
          <div class="order-no">订单号：${this.riderInfo.orderNo}</div>
          <div class="status">${this.riderInfo.status}</div>
        </div>
      `

      this.riderOverlay = new Overlay({
        element: element,
        positioning: 'bottom-center',
        offset: [0, -40],
        stopEvent: false
      })

      this.riderOverlay.setPosition(coordinate)
      this.map.addOverlay(this.riderOverlay)
    },

    clearRoute() {
      this.stopAnimation()
      if (this.riderOverlay) {
        this.map.removeOverlay(this.riderOverlay)
        this.riderOverlay = null
      }
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
      this.routeLayer.getSource().clear()
      this.routeFeature = null
      this.riderFeature = null
      this.startMarker = null
      this.endMarker = null
      this.routePoints = { start: null, end: null }
      this.riderInfo.status = '待配送'
      this.riderInfo.orderNo = 'DD' + Math.floor(Math.random() * 1000000)
    },

    // 热力图功能
    addHeatmapPoint(coordinate) {
      const transformedCoord = transform(coordinate, 'EPSG:4326', 'EPSG:3857')
      const feature = new Feature({
        geometry: new Point(transformedCoord),
        weight: Math.random()
      })
      
      this.heatmapSource.addFeature(feature)
    },

    updateHeatmapSettings({ blur, radius }) {
      this.heatmapLayer.setBlur(blur)
      this.heatmapLayer.setRadius(radius)
    },

    clearHeatmap() {
      this.heatmapSource.clear()
    },

    // 框选功能
    startBoxSelect() {
      if (this.draw) {
        this.stopBoxSelect()
      }

      this.isDrawing = true
      this.draw = new Draw({
        source: this.selectLayer.getSource(),
        type: 'Polygon',
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 2,
            lineDash: [10, 10]
          })
        })
      })

      this.map.addInteraction(this.draw)

      this.draw.on('drawend', (event) => {
        const feature = event.feature
        const geometry = feature.getGeometry()
        const extent = geometry.getExtent()
        
        const selectedFeatures = this.vectorSource.getFeaturesInExtent(extent)
          .filter(f => geometry.intersectsCoordinate(f.getGeometry().getCoordinates()))

        selectedFeatures.forEach(f => {
          f.setStyle(new Style({
            image: new Circle({
              radius: 6,
              fill: new Fill({ color: '#ffcc33' }),
              stroke: new Stroke({ color: '#ffffff', width: 2 })
            })
          }))
        })

        this.selectedArea = {
          count: selectedFeatures.length,
          coordinates: geometry.getCoordinates()[0].map(coord => 
            transform(coord, 'EPSG:3857', 'EPSG:4326')
          )
        }
      })
    },

    stopBoxSelect() {
      if (this.draw) {
        this.map.removeInteraction(this.draw)
        this.draw = null
      }
      this.isDrawing = false
    },

    clearSelection() {
      this.selectLayer.getSource().clear()
      this.selectedArea = null
      this.vectorSource.getFeatures().forEach(f => {
        f.setStyle(null)
      })
    },

    // 动画相关
    startAnimation() {
      if (this.isRiderMoving) return

      this.riderInfo.status = '配送中'
      this.isRiderMoving = true
      const start = Date.now()
      const duration = this.animationDuration || 5000 // 默认时间增加到5秒
      let lastTime = start

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
      }

      const animate = () => {
        if (!this.isRiderMoving) {
          const startCoord = this.routeFeature.getGeometry().getFirstCoordinate()
          this.riderFeature.getGeometry().setCoordinates(startCoord)
          this.riderOverlay.setPosition(startCoord)
          this.riderInfo.status = '待配送'
          return
        }

        const now = Date.now()
        if (now - lastTime < 16) {
          this.animationFrameId = requestAnimationFrame(animate)
          return
        }
        lastTime = now

        const fraction = (now - start) / duration
        
        if (fraction >= 1) {
          this.isRiderMoving = false
          this.riderInfo.status = '已送达'
          return
        }

        const geometry = this.routeFeature.getGeometry()
        const point = geometry.getCoordinateAt(easeOut(fraction))
        
        // 计算骑手朝向
        if (fraction < 1) {
          const nextPoint = geometry.getCoordinateAt(Math.min(fraction + 0.01, 1))
          let angle = Math.atan2(
            nextPoint[1] - point[1],
            nextPoint[0] - point[0]
          )
          
          // 调整角度，使骑手始终保持向右朝向
          if (Math.abs(angle) > Math.PI / 2) {
            angle = angle + Math.PI
          }
          
          this.riderFeature.setStyle(
            new Style({
              image: new Icon({
                src: '/rider.png',
                scale: 0.5,
                anchor: [0.5, 1],
                rotation: angle,
                rotateWithView: false
              })
            })
          )
        }

        this.riderFeature.getGeometry().setCoordinates(point)
        this.riderOverlay.setPosition(point)
        
        this.map.render()
        this.animationFrameId = requestAnimationFrame(animate)
      }

      animate()
    },

    stopAnimation() {
      this.isRiderMoving = false
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
    },

    // 清除所有
    clearAll() {
      this.stopAnimation()
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId)
        this.animationFrameId = null
      }
      if (this.riderOverlay) {
        this.map.removeOverlay(this.riderOverlay)
        this.riderOverlay = null
      }
      this.vectorSource.clear()
      this.clusterSource.refresh()
      this.heatmapSource.clear()
      this.routeLayer.getSource().clear()
      this.selectLayer.getSource().clear()
      this.selectedPoint = null
      this.selectedArea = null
      this.routePoints = { start: null, end: null }
      this.routeFeature = null
      this.riderFeature = null
      this.startMarker = null
      this.endMarker = null
      this.riderInfo.status = '待配送'
      this.riderInfo.orderNo = 'DD' + Math.floor(Math.random() * 1000000)
      this.currentPointData = null
      this.clearGeoJSON()
      this.closePopup()
    },

    // 添加切换聚合功能的方法
    toggleCluster(enabled) {
      this.isClusterEnabled = enabled
      this.vectorLayer.setVisible(!enabled)
      this.clusterLayer.setVisible(enabled)
      
      if (enabled) {
        this.startClusterAnimation()
      }
    },

    // 更新聚合距离
    updateClusterDistance(distance) {
      this.clusterDistance = distance
      this.clusterSource.setDistance(distance)
    },

    // 添加动画循环方法
    startClusterAnimation() {
      const animate = () => {
        if (this.clusterLayer) {
          this.clusterLayer.changed()
          requestAnimationFrame(animate)
        }
      }
      animate()
    },



    // 添加清除当前点位数据的方法
    clearCurrentPoint() {
      this.currentPointData = null
    },

    // 添加 GeoJSON 相关方法
    loadGeoJSON(data, style) {
      try {
        // 清除现有数据
        this.geoJSONSource.clear()

        // 创建 GeoJSON 格式解析器
        const format = new GeoJSON()

        // 读取特征
        const features = format.readFeatures(data, {
          featureProjection: 'EPSG:3857'
        })

        // 添加特征到源
        this.geoJSONSource.addFeatures(features)

        // 更新样式
        if (style) {
          this.updateGeoJSONStyle(style)
        }

        // 缩放到数据范围
        this.map.getView().fit(this.geoJSONSource.getExtent(), {
          padding: [50, 50, 50, 50],
          duration: 1000
        })

        return features.length
      } catch (error) {
        console.error('Error loading GeoJSON:', error)
        throw error
      }
    },

    updateGeoJSONStyle({ fill, stroke, opacity }) {
      if (!this.geoJSONLayer) return

      this.geoJSONLayer.setStyle(new Style({
        fill: new Fill({
          color: fill ? `${fill}${Math.round(opacity * 255).toString(16)}` : 'rgba(51,136,255,0.5)'
        }),
        stroke: new Stroke({
          color: stroke || '#ffffff',
          width: 2
        })
      }))
    },

    getGeoJSONFeatureCount() {
      return this.geoJSONSource ? this.geoJSONSource.getFeatures().length : 0
    },

    clearGeoJSON() {
      if (this.geoJSONSource) {
        this.geoJSONSource.clear()
      }
    },
  }
}) 