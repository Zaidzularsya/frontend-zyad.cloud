<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const mountRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const container = mountRef.value
  if (!container) return

  let width = container.clientWidth || window.innerWidth
  let height = container.clientHeight || window.innerHeight

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 0, 7.5)

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  while (container.firstChild) {
    container.removeChild(container.firstChild)
  }
  container.appendChild(renderer.domElement)

  const globeGroup = new THREE.Group()
  scene.add(globeGroup)

  const GLOBE_RADIUS = 2.5

  // 1. CORE INNER GLOW SPHERE
  const coreGeom = new THREE.SphereGeometry(GLOBE_RADIUS - 0.05, 32, 32)
  const coreMat = new THREE.MeshPhongMaterial({
    color: 0x050c1e,
    emissive: 0x0a1931,
    transparent: true,
    opacity: 0.85,
    shininess: 40,
    specular: 0x3b82f6,
  })
  const coreMesh = new THREE.Mesh(coreGeom, coreMat)
  globeGroup.add(coreMesh)

  // 2. COORDINATE GRID
  const gridGeom = new THREE.SphereGeometry(GLOBE_RADIUS - 0.02, 24, 24)
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x0ea5e9,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
  })
  const gridMesh = new THREE.Mesh(gridGeom, gridMat)
  globeGroup.add(gridMesh)

  // 3. CONTINENTAL DOT-MATRIX GENERATOR
  const latLonToUnitVector = (lat: number, lon: number) => {
    const latRad = (lat * Math.PI) / 180
    const lonRad = (lon * Math.PI) / 180
    return new THREE.Vector3(
      Math.cos(latRad) * Math.cos(lonRad),
      Math.sin(latRad),
      Math.cos(latRad) * Math.sin(lonRad),
    )
  }

  const continents = [
    {
      name: 'Eurasia_West',
      center: latLonToUnitVector(50, 15),
      radiusCos: Math.cos((26 * Math.PI) / 180),
    },
    {
      name: 'Eurasia_East',
      center: latLonToUnitVector(38, 105),
      radiusCos: Math.cos((30 * Math.PI) / 180),
    },
    {
      name: 'Siberia',
      center: latLonToUnitVector(62, 95),
      radiusCos: Math.cos((28 * Math.PI) / 180),
    },
    {
      name: 'India_Indochina',
      center: latLonToUnitVector(15, 80),
      radiusCos: Math.cos((14 * Math.PI) / 180),
    },
    {
      name: 'Africa',
      center: latLonToUnitVector(2, 20),
      radiusCos: Math.cos((30 * Math.PI) / 180),
    },
    {
      name: 'NorthAmerica_Core',
      center: latLonToUnitVector(45, -100),
      radiusCos: Math.cos((30 * Math.PI) / 180),
    },
    {
      name: 'NorthAmerica_East',
      center: latLonToUnitVector(35, -80),
      radiusCos: Math.cos((16 * Math.PI) / 180),
    },
    {
      name: 'SouthAmerica',
      center: latLonToUnitVector(-18, -60),
      radiusCos: Math.cos((24 * Math.PI) / 180),
    },
    {
      name: 'Australia',
      center: latLonToUnitVector(-24, 133),
      radiusCos: Math.cos((16 * Math.PI) / 180),
    },
    {
      name: 'Greenland',
      center: latLonToUnitVector(72, -40),
      radiusCos: Math.cos((12 * Math.PI) / 180),
    },
  ]

  const isLand = (point: THREE.Vector3) => {
    if (point.y < -0.85) return true
    for (let i = 0; i < continents.length; i++) {
      const continent = continents[i]
      if (!continent) continue
      const dist = point.dot(continent.center)
      if (dist > continent.radiusCos) {
        return true
      }
    }
    return false
  }

  const N_POINTS = 3800
  const landPoints: THREE.Vector3[] = []
  const oceanPoints: THREE.Vector3[] = []

  for (let i = 0; i < N_POINTS; i++) {
    const y = 1 - (2 * i) / (N_POINTS - 1)
    const r = Math.sqrt(1 - y * y)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const theta = goldenAngle * i

    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r

    const unitPt = new THREE.Vector3(x, y, z)
    const realPt = unitPt.clone().multiplyScalar(GLOBE_RADIUS)

    if (isLand(unitPt)) {
      landPoints.push(realPt)
    } else {
      oceanPoints.push(realPt)
    }
  }

  const landGeom = new THREE.BufferGeometry().setFromPoints(landPoints)
  const landMat = new THREE.PointsMaterial({
    color: 0x0ea5e9,
    size: 0.052,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  })
  const landMesh = new THREE.Points(landGeom, landMat)
  globeGroup.add(landMesh)

  const oceanGeom = new THREE.BufferGeometry().setFromPoints(oceanPoints)
  const oceanMat = new THREE.PointsMaterial({
    color: 0x1e293b,
    size: 0.032,
    transparent: true,
    opacity: 0.18,
    sizeAttenuation: true,
  })
  const oceanMesh = new THREE.Points(oceanGeom, oceanMat)
  globeGroup.add(oceanMesh)

  // 4. NETWORK HUBS
  const cities = [
    { name: 'Jakarta', lat: -6.2, lon: 106.8 },
    { name: 'Singapore', lat: 1.35, lon: 103.8 },
    { name: 'Tokyo', lat: 35.6, lon: 139.6 },
    { name: 'Sydney', lat: -33.8, lon: 151.2 },
    { name: 'London', lat: 51.5, lon: -0.1 },
    { name: 'New York', lat: 40.7, lon: -74.0 },
    { name: 'San Francisco', lat: 37.7, lon: -122.4 },
    { name: 'Dubai', lat: 25.2, lon: 55.3 },
    { name: 'Cape Town', lat: -33.9, lon: 18.4 },
    { name: 'Sao Paulo', lat: -23.5, lon: -46.6 },
  ]

  const cityObjects = cities.map((city) => {
    const pos = latLonToUnitVector(city.lat, city.lon).multiplyScalar(GLOBE_RADIUS)
    return { ...city, pos }
  })

  const pulsingRings: { mesh: THREE.Mesh; scale: number; speed: number }[] = []
  const ringGeom = new THREE.RingGeometry(0.04, 0.08, 16)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x14b8a6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  })

  cityObjects.forEach((city) => {
    const hubGeom = new THREE.SphereGeometry(0.045, 8, 8)
    const hubMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 })
    const hubMesh = new THREE.Mesh(hubGeom, hubMat)
    hubMesh.position.copy(city.pos)
    globeGroup.add(hubMesh)

    const ring = new THREE.Mesh(ringGeom, ringMat.clone())
    ring.position.copy(city.pos)
    const normal = city.pos.clone().normalize()
    ring.lookAt(city.pos.clone().add(normal))
    globeGroup.add(ring)

    pulsingRings.push({
      mesh: ring,
      scale: 1.0 + Math.random() * 2.0,
      speed: 0.015 + Math.random() * 0.015,
    })
  })

  // 5. CONNECTIONS
  const connectionsList: Array<[number, number]> = [
    [0, 1],
    [1, 4],
    [1, 2],
    [4, 5],
    [5, 6],
    [6, 2],
    [2, 3],
    [3, 0],
    [4, 7],
    [7, 0],
    [9, 5],
    [8, 4],
    [7, 8],
  ]

  const dataPackets: {
    curve: THREE.QuadraticBezierCurve3
    mesh: THREE.Mesh
    progress: number
    speed: number
  }[] = []
  const packetGeom = new THREE.SphereGeometry(0.035, 8, 8)
  const packetMat = new THREE.MeshBasicMaterial({ color: 0x3cddc7 })
  const lines: THREE.Line[] = []

  connectionsList.forEach((pair) => {
    const cityA = cityObjects[pair[0]]
    const cityB = cityObjects[pair[1]]
    if (!cityA || !cityB) return

    const p1 = cityA.pos
    const p2 = cityB.pos

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    const distance = p1.distanceTo(p2)
    const arcHeight = GLOBE_RADIUS + distance * 0.35
    mid.normalize().multiplyScalar(arcHeight)

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)

    const points = curve.getPoints(32)
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
    })
    const line = new THREE.Line(lineGeom, lineMat)
    globeGroup.add(line)
    lines.push(line)

    const packetMesh = new THREE.Mesh(packetGeom, packetMat)
    globeGroup.add(packetMesh)

    dataPackets.push({
      curve,
      mesh: packetMesh,
      progress: Math.random(),
      speed: 0.007 + Math.random() * 0.007,
    })
  })

  // 6. ORBIT SATELLITE
  const orbitRadius = GLOBE_RADIUS * 1.35
  const orbitPoints = []
  for (let i = 0; i <= 64; i++) {
    const theta = (i / 64) * Math.PI * 2
    orbitPoints.push(
      new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius),
    )
  }
  const orbitRingGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints)
  const orbitRingMat = new THREE.LineBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.12,
  })
  const orbitRing = new THREE.Line(orbitRingGeom, orbitRingMat)
  orbitRing.rotation.x = 0.5
  orbitRing.rotation.z = 0.3
  globeGroup.add(orbitRing)

  const satGeom = new THREE.SphereGeometry(0.05, 8, 8)
  const satMat = new THREE.MeshPhongMaterial({
    color: 0x8b5cf6,
    emissive: 0x8b5cf6,
    emissiveIntensity: 0.8,
  })
  const satMesh = new THREE.Mesh(satGeom, satMat)
  globeGroup.add(satMesh)

  // 7. LIGHTING
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(5, 5, 5)
  scene.add(dirLight)

  const pointLightBlue = new THREE.PointLight(0x3b82f6, 2.5, 12)
  pointLightBlue.position.set(-4, 3, 2)
  scene.add(pointLightBlue)

  const pointLightTeal = new THREE.PointLight(0x14b8a6, 2.0, 12)
  pointLightTeal.position.set(4, -3, 2)
  scene.add(pointLightTeal)

  // 8. INTERACTIVE
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0

  const onMouseMove = (event: MouseEvent) => {
    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    targetX = x * 0.0003
    targetY = y * 0.0002
  }

  container.addEventListener('mousemove', onMouseMove)

  // 9. LOOP
  let time = 0
  let animationFrameId: number

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate)
    time += 0.01

    currentX += (targetX - currentX) * 0.05
    currentY += (targetY - currentY) * 0.05

    globeGroup.rotation.y = time * 0.06 + currentX
    globeGroup.rotation.x = currentY

    pulsingRings.forEach((ring) => {
      ring.scale += ring.speed
      if (ring.scale > 3.0) ring.scale = 1.0
      ring.mesh.scale.set(ring.scale, ring.scale, 1)
      ;(ring.mesh.material as THREE.Material).opacity = Math.max(0, 1.0 - (ring.scale - 1.0) / 2.0)
    })

    dataPackets.forEach((packet) => {
      packet.progress += packet.speed
      if (packet.progress > 1.0) packet.progress = 0
      const pos = packet.curve.getPointAt(packet.progress)
      packet.mesh.position.copy(pos)
    })

    const satAngle = time * 0.25
    const satPos = new THREE.Vector3(
      Math.cos(satAngle) * orbitRadius,
      0,
      Math.sin(satAngle) * orbitRadius,
    )
    satPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5)
    satPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.3)
    satMesh.position.copy(satPos)

    const pulse = 1.0 + Math.sin(time * 2.0) * 0.02
    coreMesh.scale.set(pulse, pulse, pulse)

    renderer.render(scene, camera)
  }

  animate()

  const handleResize = () => {
    width = container.clientWidth || window.innerWidth
    height = container.clientHeight || window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  window.addEventListener('resize', handleResize)

  // 10. CLEANUP
  onUnmounted(() => {
    container.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('resize', handleResize)
    cancelAnimationFrame(animationFrameId)

    while (globeGroup.children.length > 0) {
      const child = globeGroup.children[0]
      if (!child) break
      globeGroup.remove(child)
    }
    scene.remove(globeGroup)

    coreGeom.dispose()
    gridGeom.dispose()
    landGeom.dispose()
    oceanGeom.dispose()
    ringGeom.dispose()
    packetGeom.dispose()
    orbitRingGeom.dispose()
    satGeom.dispose()

    coreMat.dispose()
    gridMat.dispose()
    landMat.dispose()
    oceanMat.dispose()
    ringMat.dispose()
    pulsingRings.forEach((r) => {
      if (Array.isArray(r.mesh.material)) {
        r.mesh.material.forEach((m) => m.dispose())
      } else {
        r.mesh.material.dispose()
      }
    })
    lines.forEach((l) => {
      if (Array.isArray(l.material)) {
        l.material.forEach((m) => m.dispose())
      } else {
        l.material.dispose()
      }
    })
    packetMat.dispose()
    orbitRingMat.dispose()
    satMat.dispose()

    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
    renderer.dispose()
  })
})
</script>

<template>
  <div ref="mountRef" class="w-full h-full min-h-[400px]"></div>
</template>
