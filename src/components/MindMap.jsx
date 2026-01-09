import { useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import './MindMap.css'
import gpkData from '../data/gpk_data.json'
import CustomNode from './CustomNode'

const nodeTypes = {
  custom: CustomNode,
}

// Dagre layout (no caching to avoid stale position issues)
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  if (nodes.length === 0) return { nodes: [], edges }

  // Calculate layout
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 100 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 50,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

function MindMapInner({
  onArticleSelect,
  selectedArticle,
  showSemanticLinks,
  highlightedArticles,
  focusNodeId
}) {
  const [nodes, setNodes] = useNodesState([])
  const [edges, setEdges] = useEdgesState([])
  const { fitView, setCenter } = useReactFlow()
  const lastHighlightedRef = useRef(null)
  const lastFocusedRef = useRef(null)
  const nodePositionsRef = useRef({})

  // Store direct and semantic edges separately for toggling
  const directEdgesRef = useRef([])
  const semanticEdgesRef = useRef([])

  // Create nodes and layout from GPK data (only when search changes)
  useEffect(() => {
    // Determine which articles to show based on highlighted (searched) articles
    let articlesToShow = new Set()

    if (highlightedArticles.length > 0) {
      // Show highlighted articles and their connections
      highlightedArticles.forEach(articleNum => {
        articlesToShow.add(articleNum)

        // Add direct references from this article
        const directRefs = gpkData.direct_references[articleNum] || []
        directRefs.forEach(ref => articlesToShow.add(ref))

        // Add articles that reference this article
        Object.entries(gpkData.direct_references).forEach(([source, targets]) => {
          if (targets.includes(articleNum)) {
            articlesToShow.add(source)
          }
        })
      })
    }

    const initialNodes = Array.from(articlesToShow).map((articleNum) => {
      const article = gpkData.articles[articleNum]
      if (!article) return null

      const isHighlighted = highlightedArticles.includes(article.number)

      return {
        id: article.number,
        type: 'custom',
        data: {
          label: `Чл. ${article.number}`,
          title: article.title,
          article: article,
          isSelected: false, // Will be updated by separate effect
          isHighlighted: isHighlighted,
        },
        position: { x: 0, y: 0 },
      }
    }).filter(Boolean)

    // Create edges from direct references
    const directEdges = []
    Object.entries(gpkData.direct_references).forEach(([source, targets]) => {
      if (!articlesToShow.has(source)) return

      targets.forEach((target) => {
        if (!articlesToShow.has(target)) return

        directEdges.push({
          id: `${source}-${target}`,
          source,
          target,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
        })
      })
    })

    // Create semantic edges (stored for toggling)
    const semanticEdges = Object.entries(gpkData.semantic_links).flatMap(([source, targets]) => {
      if (!articlesToShow.has(source)) return []

      return targets.slice(0, 5).map((target) => {
        if (!articlesToShow.has(target)) return null

        return {
          id: `sem-${source}-${target}`,
          source,
          target,
          type: 'straight',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5,5' },
          markerEnd: {
            type: MarkerType.Arrow,
            color: '#94a3b8',
          },
        }
      }).filter(Boolean)
    })

    // Store edges in refs for the toggle effect
    directEdgesRef.current = directEdges
    semanticEdgesRef.current = semanticEdges

    // Layout is based only on direct edges (semantic links are overlaid)
    const { nodes: layoutedNodes } = getLayoutedElements(
      initialNodes,
      directEdges
    )

    // Store positions for focus effect
    nodePositionsRef.current = {}
    layoutedNodes.forEach(node => {
      nodePositionsRef.current[node.id] = node.position
    })

    setNodes(layoutedNodes)
    // Set edges based on current showSemanticLinks state
    setEdges(showSemanticLinks ? [...directEdges, ...semanticEdges] : directEdges)

    // Fit view when highlighted articles change (new search)
    const highlightedKey = highlightedArticles.join(',')
    if (highlightedKey !== lastHighlightedRef.current) {
      lastHighlightedRef.current = highlightedKey
      lastFocusedRef.current = null
      // Fit view after a short delay to allow nodes to render
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 })
      }, 50)
    }
  // Note: showSemanticLinks is intentionally not in dependencies - we handle it in a separate effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedArticles, setNodes, setEdges, fitView])

  // Separate effect for toggling semantic links - only updates edges, no layout recalculation
  useEffect(() => {
    if (directEdgesRef.current.length === 0) return

    setEdges(showSemanticLinks
      ? [...directEdgesRef.current, ...semanticEdgesRef.current]
      : directEdgesRef.current
    )
  }, [showSemanticLinks, setEdges])

  // Separate effect for focusing on a specific node (triggered by search result click)
  useEffect(() => {
    if (focusNodeId && focusNodeId !== lastFocusedRef.current && nodePositionsRef.current[focusNodeId]) {
      const position = nodePositionsRef.current[focusNodeId]
      lastFocusedRef.current = focusNodeId
      setTimeout(() => {
        setCenter(position.x + 100, position.y + 50, {
          zoom: 1.2,
          duration: 500
        })
      }, 100)
    }
  }, [focusNodeId, setCenter])

  // Update selection state without recalculating layout
  useEffect(() => {
    if (!selectedArticle) return

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.data.article.number === selectedArticle.number,
        },
      }))
    )
  }, [selectedArticle, setNodes])


  const onNodeClick = useCallback((_, node) => {
    onArticleSelect(node.data.article)
  }, [onArticleSelect])

  return (
    <div className="mindmap-wrapper">
      {nodes.length === 0 ? (
        <div className="empty-state">
          <h2>Търсене в ГПК</h2>
          <p>Използвайте полето за търсене, за да намерите членове и да видите техните връзки</p>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          attributionPosition="bottom-left"
        >
          <Background variant="dots" gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.data.isSelected) return '#3b82f6'
              if (node.data.isHighlighted) return '#f59e0b'
              return '#94a3b8'
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      )}
    </div>
  )
}

// Wrapper component that provides ReactFlowProvider
function MindMap(props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  )
}

export default MindMap
