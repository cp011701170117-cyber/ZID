import { useState, useEffect } from 'react'
import { apiRequest } from '../utils/api'

/**
 * BlockchainVisualizer - A reusable component that displays live blockchain activity.
 * Uses real blockchain data from API while preserving existing visual structure.
 */
export default function BlockchainVisualizer({ triggerAnimation = false }) {
  const [blocks, setBlocks] = useState([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [showMessage, setShowMessage] = useState('')

  const formatTime = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const normalizeChain = (chain) => {
    if (!Array.isArray(chain)) return []

    return [...chain]
      .sort((a, b) => {
        const aIndex = Number.isFinite(Number(a?.index)) ? Number(a.index) : 0
        const bIndex = Number.isFinite(Number(b?.index)) ? Number(b.index) : 0
        return aIndex - bIndex
      })
      .map((block) => ({
        id: String(block?.hash || `block-${block?.index ?? 'na'}`),
        number: block?.index ?? 'N/A',
        hash: block?.hash ? String(block.hash).slice(0, 10) : 'N/A',
        timestamp: formatTime(block?.timestamp),
        isNew: false
      }))
  }

  const fetchAndRenderChain = async ({ highlightLatest = false } = {}) => {
    try {
      let chainResponse
      try {
        chainResponse = await apiRequest('/chain')
      } catch (err) {
        if (err?.status === 404) {
          chainResponse = await apiRequest('/blockchain')
        } else {
          throw err
        }
      }

      const chain = Array.isArray(chainResponse)
        ? chainResponse
        : Array.isArray(chainResponse?.chain)
          ? chainResponse.chain
          : []

      const normalized = normalizeChain(chain)

      setBlocks(prevBlocks => {
        if (!highlightLatest || normalized.length === 0) {
          return normalized
        }

        const prevLatest = prevBlocks.length > 0 ? prevBlocks[prevBlocks.length - 1].number : null
        const nextLatest = normalized[normalized.length - 1].number
        const hasNewBlock = prevLatest !== null && nextLatest !== prevLatest

        if (!hasNewBlock) {
          return normalized
        }

        return normalized.map((block, idx) => (
          idx === normalized.length - 1 ? { ...block, isNew: true } : block
        ))
      })
    } catch (err) {
      console.error('Failed to load blockchain', err)
    }
  }

  // Initial load and periodic refresh to keep visual synced.
  useEffect(() => {
    fetchAndRenderChain()

    const intervalId = window.setInterval(() => {
      fetchAndRenderChain()
    }, 12000)

    return () => window.clearInterval(intervalId)
  }, [])

  // Handle external trigger for animation (when credential is issued)
  useEffect(() => {
    if (triggerAnimation) {
      addNewBlock()
    }
  }, [triggerAnimation])

  const addNewBlock = () => {
    if (isAnimating) return

    setIsAnimating(true)
    setShowMessage('Generating Block...')

    // Refresh from real chain; latest block is highlighted if index increased.
    setTimeout(async () => {
      await fetchAndRenderChain({ highlightLatest: true })
      setShowMessage('✓ New Block Added')

      setTimeout(() => {
        setShowMessage('')
        setIsAnimating(false)
        setBlocks(prevBlocks => prevBlocks.map(block => ({ ...block, isNew: false })))
      }, 1500)
    }, 600)
  }

  return (
    <div className="blockchain-visualizer-container">
      {/* Animated Grid Background */}
      <div className="blockchain-grid-bg" />

      {/* Blockchain Panel */}
      <div className="blockchain-activity-panel">
        <div className="panel-header">
          <div className="panel-icon panel-icon-cyan">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="panel-title">Blockchain Activity</h2>
        </div>

        {/* Animation Status Message */}
        {showMessage && (
          <div className={`animation-status ${isAnimating ? 'animating' : 'complete'}`}>
            {showMessage}
          </div>
        )}

        {/* Blockchain Chain Display */}
        <div className="blockchain-chain-wrapper">
          <div className="blockchain-chain">
            {blocks.map((block, idx) => (
              <div key={block.id}>
                <div className={`blockchain-block ${block.isNew ? 'block-new-animation' : ''}`}>
                  <div className="block-content">
                    <div className="block-number">Block #{block.number}</div>
                    <div className="block-hash">{block.hash}</div>
                    <div className="block-time">{block.timestamp}</div>
                  </div>
                </div>
                {idx < blocks.length - 1 && <div className="block-connection" />}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="blockchain-stats">
          <div className="stat-item">
            <span className="stat-label">Total Blocks:</span>
            <span className="stat-value">{blocks.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Latest Block:</span>
            <span className="stat-value">#{blocks[blocks.length - 1]?.number || 'N/A'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className="stat-value status-active">● Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
