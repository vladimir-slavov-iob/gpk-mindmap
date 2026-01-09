import { useState, useEffect, useRef } from 'react'
import './SearchBar.css'
import gpkData from '../data/gpk_data.json'

function SearchBar({ onResults, onArticleSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim() === '') {
      setResults([])
      // Don't call onResults([]) here - keep the existing graph visible
      return
    }

    const searchQuery = query.toLowerCase()
    const foundArticles = Object.values(gpkData.articles).filter((article) => {
      // Search in article number
      if (article.number.toString().includes(searchQuery)) {
        return true
      }

      // Search in title
      if (article.title && article.title.toLowerCase().includes(searchQuery)) {
        return true
      }

      // Search in content
      if (article.content.toLowerCase().includes(searchQuery)) {
        return true
      }

      return false
    })

    setResults(foundArticles.slice(0, 20)) // Limit to 20 results
    // Don't call onResults here - only update graph when user clicks a result
    setShowResults(true)
  }, [query])

  const handleInputChange = (e) => {
    setQuery(e.target.value)
  }

  const handleResultClick = (article) => {
    // Update the graph to show this article and its connections
    onResults([article])
    // Select the article to show in the panel and focus on it
    if (onArticleSelect) {
      onArticleSelect(article, true) // true = should focus on the node
    }
    // Close the dropdown
    setShowResults(false)
  }

  const highlightMatch = (text, query) => {
    if (!query) return text

    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      )
    )
  }

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <svg
          className="search-icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Търси по номер, заглавие или съдържание..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query && setShowResults(true)}
        />
        {query && (
          <button
            className="clear-btn"
            onClick={() => {
              setQuery('')
              // Don't call onResults([]) - keep the existing graph visible
              setShowResults(false)
            }}
          >
            ✕
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="search-results">
          <div className="results-header">
            Намерени {results.length} резултата{results.length === 20 ? '+' : ''}
          </div>
          <div className="results-list">
            {results.map((article) => (
              <div
                key={article.number}
                className="result-item"
                onClick={() => handleResultClick(article)}
              >
                <div className="result-number">Чл. {article.number}</div>
                {article.title && (
                  <div className="result-title">
                    {highlightMatch(article.title, query)}
                  </div>
                )}
                <div className="result-preview">
                  {highlightMatch(
                    article.content.substring(0, 150) +
                      (article.content.length > 150 ? '...' : ''),
                    query
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && query && results.length === 0 && (
        <div className="search-results">
          <div className="no-results">Няма намерени резултати</div>
        </div>
      )}
    </div>
  )
}

export default SearchBar
