import { useEffect, useState } from 'react'
import SphereMap from './components/SphereMap'
import MindMap from './components/MindMap'
import ArticlePanel from './components/ArticlePanel'
import SearchBar from './components/SearchBar'
import './App.css'

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1024px)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const update = (e) => setIsCompact(e.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isCompact
}

function App() {
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showSemanticLinks, setShowSemanticLinks] = useState(false)
  const [highlightedArticles, setHighlightedArticles] = useState([])
  const [focusNodeId, setFocusNodeId] = useState(null)
  const [viewMode, setViewMode] = useState('sphere')
  const isCompact = useIsCompact()

  const handleArticleSelect = (articleData, shouldFocus = false) => {
    setSelectedArticle(articleData)
    // Only focus if explicitly requested (e.g., from search results)
    if (articleData && shouldFocus) {
      setFocusNodeId(articleData.number)
    }
  }

  const handleSearchResults = (results) => {
    setHighlightedArticles(results.map(r => r.number))
    // Don't set focus here - let the search result click handle it
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="brand-text">
            <span className="brand-title">Граждански процесуален кодекс</span>
            <span className="brand-tagline">Интерактивна карта</span>
          </h1>
        </div>
        <div className="header-controls">
          <SearchBar
            onResults={handleSearchResults}
            onArticleSelect={handleArticleSelect}
          />
          <div className="view-toggle" role="tablist" aria-label="Изглед">
            <button
              role="tab"
              aria-selected={viewMode === 'sphere'}
              className={viewMode === 'sphere' ? 'active' : ''}
              onClick={() => setViewMode('sphere')}
            >
              Сфера
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'mindmap'}
              className={viewMode === 'mindmap' ? 'active' : ''}
              onClick={() => setViewMode('mindmap')}
            >
              Карта
            </button>
          </div>
          <label className="semantic-toggle">
            <input
              type="checkbox"
              checked={showSemanticLinks}
              onChange={(e) => setShowSemanticLinks(e.target.checked)}
            />
            <span>Покажи семантични връзки</span>
          </label>
        </div>
      </header>

      <div className="app-content">
        <div
          className={`mindmap-container ${viewMode === 'mindmap' ? 'mindmap-mode' : ''}`}
        >
          {viewMode === 'sphere' ? (
            <SphereMap
              onArticleSelect={handleArticleSelect}
              selectedArticle={selectedArticle}
              showSemanticLinks={showSemanticLinks}
              highlightedArticles={highlightedArticles}
              focusNodeId={focusNodeId}
            />
          ) : (
            <MindMap
              onArticleSelect={handleArticleSelect}
              selectedArticle={selectedArticle}
              showSemanticLinks={showSemanticLinks}
              highlightedArticles={highlightedArticles}
              focusNodeId={focusNodeId}
            />
          )}
        </div>

        {(selectedArticle || !isCompact) && (
          <div className="panel-container">
            {selectedArticle ? (
              <ArticlePanel
                article={selectedArticle}
                onClose={() => setSelectedArticle(null)}
                onArticleClick={handleArticleSelect}
              />
            ) : (
              <div className="panel-placeholder">
                <h2>Изберете член</h2>
                <p>
                  Кликнете върху възел от сферата или потърсете член по номер,
                  заглавие или съдържание. Текстът на члена ще се появи тук, а
                  препратките вътре в него ще можете да следвате с клик.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
