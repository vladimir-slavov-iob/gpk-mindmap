import { useState } from 'react'
import MindMap from './components/MindMap'
import ArticlePanel from './components/ArticlePanel'
import SearchBar from './components/SearchBar'
import './App.css'

function App() {
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showSemanticLinks, setShowSemanticLinks] = useState(false)
  const [highlightedArticles, setHighlightedArticles] = useState([])
  const [focusNodeId, setFocusNodeId] = useState(null)

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
        <h1>Граждански процесуален кодекс - Интерактивна карта</h1>
        <div className="header-controls">
          <SearchBar
            onResults={handleSearchResults}
            onArticleSelect={handleArticleSelect}
          />
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
        <div className="mindmap-container">
          <MindMap
            onArticleSelect={handleArticleSelect}
            selectedArticle={selectedArticle}
            showSemanticLinks={showSemanticLinks}
            highlightedArticles={highlightedArticles}
            focusNodeId={focusNodeId}
          />
        </div>

        {selectedArticle && (
          <div className="panel-container">
            <ArticlePanel
              article={selectedArticle}
              onClose={() => setSelectedArticle(null)}
              onArticleClick={handleArticleSelect}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
