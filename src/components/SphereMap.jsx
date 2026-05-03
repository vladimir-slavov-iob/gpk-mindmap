import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './SphereMap.css'
import gpkData from '../data/gpk_data.json'

const SPHERE_RADIUS = 100
const NODE_BASE_RADIUS = 1.4
const NODE_HIGHLIGHT_RADIUS = 2.6
const NODE_SELECTED_RADIUS = 3.2

const CLUSTER_COLORS = [
  0xef4444, 0xf97316, 0xeab308, 0x22c55e,
  0x14b8a6, 0x3b82f6, 0x8b5cf6, 0xec4899,
  0xf472b6, 0x84cc16, 0x06b6d4, 0xa78bfa,
]
const OTHER_COLOR = 0x6b7280

// Label propagation on the undirected reference graph. Each node starts with
// its own label, then repeatedly adopts the most common label among neighbours
// until stable. Deterministic order (no randomization) so layout is stable
// across reloads.
const labelPropagationClusters = (numbers, directReferences) => {
  const adj = new Map()
  numbers.forEach((n) => adj.set(n, new Set()))
  Object.entries(directReferences).forEach(([src, targets]) => {
    if (!adj.has(src)) return
    targets.forEach((t) => {
      if (!adj.has(t) || t === src) return
      adj.get(src).add(t)
      adj.get(t).add(src)
    })
  })

  const labels = new Map()
  numbers.forEach((n) => labels.set(n, n))

  const order = [...numbers]
  for (let iter = 0; iter < 30; iter++) {
    let changed = false
    for (const n of order) {
      const neighbours = adj.get(n)
      if (neighbours.size === 0) continue
      const counts = new Map()
      for (const nb of neighbours) {
        const lbl = labels.get(nb)
        counts.set(lbl, (counts.get(lbl) || 0) + 1)
      }
      let best = null
      let bestCount = -1
      for (const [lbl, cnt] of counts) {
        if (cnt > bestCount || (cnt === bestCount && (best === null || lbl < best))) {
          best = lbl
          bestCount = cnt
        }
      }
      if (best !== labels.get(n)) {
        labels.set(n, best)
        changed = true
      }
    }
    if (!changed) break
  }

  // Group by label, rank by size.
  const groups = new Map()
  labels.forEach((lbl, n) => {
    if (!groups.has(lbl)) groups.set(lbl, [])
    groups.get(lbl).push(n)
  })
  const ranked = Array.from(groups.values()).sort(
    (a, b) => b.length - a.length || parseInt(a[0], 10) - parseInt(b[0], 10),
  )

  // Top N clusters get distinct palette colors; everything smaller is "other".
  const MIN_CLUSTER_SIZE = 6
  const palette = []
  const memberToCluster = new Map()
  let assigned = 0
  for (const members of ranked) {
    if (assigned < CLUSTER_COLORS.length && members.length >= MIN_CLUSTER_SIZE) {
      const id = assigned
      const color = CLUSTER_COLORS[id]
      members.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      const sample = members.slice(0, 3).map((m) => `чл. ${m}`).join(', ')
      palette.push({
        id,
        color,
        size: members.length,
        members,
        label: `Клъстер ${id + 1} · ${members.length} члена`,
        sample,
      })
      members.forEach((m) => memberToCluster.set(m, id))
      assigned++
    } else {
      members.forEach((m) => memberToCluster.set(m, -1))
    }
  }
  // "Other" bucket — collect remaining.
  const otherMembers = []
  numbers.forEach((n) => {
    if (memberToCluster.get(n) === -1 || !memberToCluster.has(n)) {
      memberToCluster.set(n, palette.length)
      otherMembers.push(n)
    }
  })
  if (otherMembers.length) {
    palette.push({
      id: palette.length,
      color: OTHER_COLOR,
      size: otherMembers.length,
      members: otherMembers,
      label: `Без клъстер · ${otherMembers.length} члена`,
      sample: '',
    })
  }
  return { memberToCluster, palette }
}

// Even distribution on a sphere via Fibonacci spiral. Iteration order of nodes
// determines which patch each node lands in, so feeding nodes grouped by
// cluster yields visible coherent regions.
const fibonacciSpherePositions = (count, radius) => {
  const positions = new Array(count)
  const phi = Math.PI * (Math.sqrt(5) - 1)
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(count - 1, 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    positions[i] = new THREE.Vector3(
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius,
    )
  }
  return positions
}

function SphereMap({
  onArticleSelect,
  selectedArticle,
  showSemanticLinks,
  highlightedArticles,
  focusNodeId,
}) {
  const mountRef = useRef(null)
  const tooltipRef = useRef(null)
  const stateRef = useRef(null)
  const [hoverInfo, setHoverInfo] = useState(null)

  // Compute graph clusters from direct_references via label propagation.
  const clustering = useMemo(() => {
    const numbers = Object.keys(gpkData.articles)
    return labelPropagationClusters(numbers, gpkData.direct_references)
  }, [])

  const [activeClusters, setActiveClusters] = useState(
    () => new Set(clustering.palette.map((c) => c.id)),
  )

  // Order articles by (cluster rank, article number) so each cluster occupies
  // a contiguous patch when laid out on the Fibonacci spiral.
  const nodesData = useMemo(() => {
    const articles = Object.values(gpkData.articles)
    articles.sort((a, b) => {
      const ca = clustering.memberToCluster.get(a.number) ?? 999
      const cb = clustering.memberToCluster.get(b.number) ?? 999
      if (ca !== cb) return ca - cb
      const an = parseInt(a.number, 10)
      const bn = parseInt(b.number, 10)
      if (an !== bn) return an - bn
      return a.number.localeCompare(b.number)
    })
    const positions = fibonacciSpherePositions(articles.length, SPHERE_RADIUS)
    return articles.map((article, i) => {
      const ci = clustering.memberToCluster.get(article.number) ?? clustering.palette.length - 1
      const cluster = clustering.palette[ci]
      return {
        article,
        number: article.number,
        cluster: ci,
        color: cluster ? cluster.color : OTHER_COLOR,
        position: positions[i],
      }
    })
  }, [clustering])

  const nodeIndexByNumber = useMemo(() => {
    const m = new Map()
    nodesData.forEach((n, i) => m.set(n.number, i))
    return m
  }, [nodesData])

  // -------- Three.js scene setup (runs once) --------
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000,
    )
    camera.position.set(0, 0, 280)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.domElement.classList.add('sphere-canvas')
    mount.appendChild(renderer.domElement)

    // Lights for the standard-material globe
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const dir = new THREE.DirectionalLight(0xffffff, 0.7)
    dir.position.set(200, 200, 300)
    scene.add(dir)

    // Translucent globe
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS - 1.5, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x10182f,
        transparent: true,
        opacity: 0.55,
        roughness: 0.9,
        metalness: 0.0,
      }),
    )
    scene.add(globe)

    // Wireframe overlay for visual reference
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS - 0.5, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x4b5b8a,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      }),
    )
    scene.add(wire)

    // Nodes
    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)
    const nodeGeometry = new THREE.SphereGeometry(NODE_BASE_RADIUS, 12, 12)
    const meshes = nodesData.map((d, i) => {
      const mesh = new THREE.Mesh(
        nodeGeometry,
        new THREE.MeshBasicMaterial({ color: d.color }),
      )
      mesh.position.copy(d.position)
      mesh.userData = { index: i, article: d.article, baseColor: d.color }
      nodeGroup.add(mesh)
      return mesh
    })

    const edgeGroup = new THREE.Group()
    scene.add(edgeGroup)

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.5
    controls.minDistance = 130
    controls.maxDistance = 600
    controls.enablePan = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.addEventListener('start', () => {
      controls.autoRotate = false
    })

    // Picking
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    const pickAt = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const visibleMeshes = meshes.filter((m) => m.visible)
      const hits = raycaster.intersectObjects(visibleMeshes, false)
      return hits.length ? hits[0].object : null
    }

    let downX = 0
    let downY = 0
    const onPointerDown = (e) => {
      downX = e.clientX
      downY = e.clientY
    }
    const onPointerUp = (e) => {
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (dx * dx + dy * dy > 25) return // treat as drag
      const hit = pickAt(e.clientX, e.clientY)
      if (hit) {
        onArticleSelect(hit.userData.article)
      }
    }

    let hoverMesh = null
    const onPointerMove = (e) => {
      const hit = pickAt(e.clientX, e.clientY)
      if (hit !== hoverMesh) {
        hoverMesh = hit
        if (hit) {
          renderer.domElement.style.cursor = 'pointer'
          setHoverInfo({
            x: e.clientX,
            y: e.clientY,
            number: hit.userData.article.number,
            title: hit.userData.article.title || '',
          })
        } else {
          renderer.domElement.style.cursor = ''
          setHoverInfo(null)
        }
      } else if (hit) {
        setHoverInfo((prev) =>
          prev ? { ...prev, x: e.clientX, y: e.clientY } : prev,
        )
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', () => {
      hoverMesh = null
      setHoverInfo(null)
    })

    // Resize
    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // Camera focus animation state
    let focusAnim = null

    const animate = () => {
      stateRef.current.raf = requestAnimationFrame(animate)

      if (focusAnim) {
        focusAnim.t += 0.04
        const t = Math.min(focusAnim.t, 1)
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        camera.position.lerpVectors(focusAnim.from, focusAnim.to, ease)
        controls.target.lerpVectors(focusAnim.targetFrom, focusAnim.targetTo, ease)
        if (t >= 1) focusAnim = null
      }

      controls.update()
      renderer.render(scene, camera)
    }

    stateRef.current = {
      scene,
      camera,
      renderer,
      controls,
      meshes,
      nodeGroup,
      edgeGroup,
      raf: 0,
      setFocusAnim: (next) => {
        focusAnim = next
        controls.autoRotate = false
      },
    }
    animate()

    return () => {
      cancelAnimationFrame(stateRef.current.raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      controls.dispose()
      meshes.forEach((m) => m.material.dispose())
      nodeGeometry.dispose()
      globe.geometry.dispose()
      globe.material.dispose()
      wire.geometry.dispose()
      wire.material.dispose()
      edgeGroup.children.forEach((line) => {
        line.geometry?.dispose()
        line.material?.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
      stateRef.current = null
    }
    // We intentionally exclude callbacks from deps to keep the scene stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesData])

  // -------- Update node visibility based on cluster filter --------
  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    s.meshes.forEach((mesh) => {
      const ci = nodesData[mesh.userData.index].cluster
      mesh.visible = activeClusters.has(ci)
    })
  }, [activeClusters, nodesData])

  // -------- Update highlights & selection visuals --------
  useEffect(() => {
    const s = stateRef.current
    if (!s) return

    const highlightSet = new Set(highlightedArticles || [])
    const selectedNumber = selectedArticle?.number

    s.meshes.forEach((mesh) => {
      const { baseColor } = mesh.userData
      const num = nodesData[mesh.userData.index].number
      const isSelected = num === selectedNumber
      const isHighlighted = highlightSet.has(num)

      let scale = 1
      let color = baseColor
      if (isSelected) {
        scale = NODE_SELECTED_RADIUS / NODE_BASE_RADIUS
        color = 0xffffff
      } else if (isHighlighted) {
        scale = NODE_HIGHLIGHT_RADIUS / NODE_BASE_RADIUS
        color = 0xfbbf24
      }
      mesh.scale.setScalar(scale)
      mesh.material.color.setHex(color)
    })
  }, [selectedArticle, highlightedArticles, nodesData])

  // -------- Build edges for selected article --------
  useEffect(() => {
    const s = stateRef.current
    if (!s) return
    // Clear previous edges
    while (s.edgeGroup.children.length) {
      const child = s.edgeGroup.children[0]
      s.edgeGroup.remove(child)
      child.geometry?.dispose()
      child.material?.dispose()
    }

    if (!selectedArticle) return

    const sourceNum = selectedArticle.number
    const sourceIdx = nodeIndexByNumber.get(sourceNum)
    if (sourceIdx === undefined) return
    const sourcePos = nodesData[sourceIdx].position

    const drawArc = (target, color, opacity = 0.85) => {
      const targetIdx = nodeIndexByNumber.get(target)
      if (targetIdx === undefined) return
      const targetPos = nodesData[targetIdx].position
      // Curved arc: bend midpoint outward from sphere center
      const mid = sourcePos.clone().add(targetPos).multiplyScalar(0.5)
      const lift = SPHERE_RADIUS * 1.18
      mid.normalize().multiplyScalar(lift)
      const curve = new THREE.QuadraticBezierCurve3(sourcePos, mid, targetPos)
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30))
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      })
      const line = new THREE.Line(geom, mat)
      s.edgeGroup.add(line)
    }

    // Outgoing direct references
    const outgoing = gpkData.direct_references[sourceNum] || []
    outgoing.forEach((t) => drawArc(t, 0x60a5fa, 0.9))

    // Incoming direct references
    Object.entries(gpkData.direct_references).forEach(([src, targets]) => {
      if (targets.includes(sourceNum)) {
        drawArc(src, 0xfb7185, 0.7)
      }
    })

    if (showSemanticLinks) {
      const semantic = (gpkData.semantic_links[sourceNum] || []).slice(0, 8)
      semantic.forEach((t) => drawArc(t, 0xa78bfa, 0.45))
    }
  }, [selectedArticle, showSemanticLinks, nodesData, nodeIndexByNumber])

  // -------- Camera focus on a specific node --------
  useEffect(() => {
    const s = stateRef.current
    if (!s || !focusNodeId) return
    const idx = nodeIndexByNumber.get(focusNodeId)
    if (idx === undefined) return
    const target = nodesData[idx].position.clone()
    const distance = 200
    const camTarget = target.clone().normalize().multiplyScalar(distance)
    s.setFocusAnim({
      from: s.camera.position.clone(),
      to: camTarget,
      targetFrom: s.controls.target.clone(),
      targetTo: target.clone().multiplyScalar(0.0),
      t: 0,
    })
  }, [focusNodeId, nodeIndexByNumber, nodesData])

  const toggleCluster = (i) => {
    setActiveClusters((prev) => {
      const next = new Set(prev)
      if (next.has(i)) {
        if (next.size === 1) {
          // toggling the only enabled cluster off → re-enable all
          return new Set(clustering.palette.map((c) => c.id))
        }
        next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
  }

  return (
    <div className="sphere-wrapper">
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {hoverInfo && (
        <div
          ref={tooltipRef}
          className="sphere-tooltip"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <span className="tt-num">Чл. {hoverInfo.number}</span>
          {hoverInfo.title && (
            <span className="tt-title">{hoverInfo.title}</span>
          )}
        </div>
      )}

      <div className="sphere-hud">
        Завъртете с <kbd>ляв бутон</kbd>, увеличете с <kbd>колелце</kbd>,
        кликнете върху възел за детайли.
      </div>

      <div className="sphere-legend">
        <div className="legend-title">Клъстери (по преки връзки)</div>
        <ul>
          {clustering.palette.map((c) => (
            <li
              key={c.id}
              className={activeClusters.has(c.id) ? '' : 'dim'}
              onClick={() => toggleCluster(c.id)}
              title={c.sample ? `напр. ${c.sample}` : 'Кликнете за скриване/показване'}
            >
              <span
                className="swatch"
                style={{
                  background: `#${c.color.toString(16).padStart(6, '0')}`,
                  color: `#${c.color.toString(16).padStart(6, '0')}`,
                }}
              />
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SphereMap
