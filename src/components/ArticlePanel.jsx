import React, { useRef, useEffect } from 'react'
import './ArticlePanel.css'
import gpkData from '../data/gpk_data.json'

function ArticlePanel({ article, onClose, onArticleClick }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0
    }
  }, [article])

  const directRefs = gpkData.direct_references[article.number] || []
  const semanticRefs = (gpkData.semantic_links[article.number] || []).slice(0, 10)

  // Find articles that reference this article
  const referencedBy = Object.entries(gpkData.direct_references)
    .filter(([_, targets]) => targets.includes(article.number))
    .map(([source, _]) => source)

  const handleRefClick = (refNumber) => {
    const refArticle = gpkData.articles[refNumber]
    if (refArticle) {
      onArticleClick(refArticle)
    }
  }

  const renderContent = (content) => {
    // Replace article references with clickable links
    // But skip external law references (e.g., "чл. 6 от Закона за държавните такси")
    const articlePattern = /чл\.\s*(\d+[а-я]*)/gi
    const parts = []
    let lastIndex = 0
    let match

    // Pattern to detect if this is an external law reference
    // Matches: "чл. X от [Capitalized Law Name]" where the law name starts with capital Cyrillic
    const externalRefPattern = /^(?:,\s*ал\.\s*\d+)?\s+от\s+[А-Я]/

    const regex = new RegExp(articlePattern)
    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Check if this is an external law reference by looking at what follows
      const textAfterMatch = content.substring(regex.lastIndex)
      const isExternalRef = externalRefPattern.test(textAfterMatch)

      // Add clickable reference only if it's in our GPK data and not an external reference
      const refNumber = match[1]
      if (gpkData.articles[refNumber] && !isExternalRef) {
        parts.push(
          <span
            key={match.index}
            className="article-ref-link"
            onClick={() => handleRefClick(refNumber)}
            title={`Отиди на чл. ${refNumber}`}
          >
            {match[0]}
          </span>
        )
      } else {
        parts.push(match[0])
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  return (
    <div className="article-panel" ref={panelRef}>
      <div className="panel-header">
        <div>
          <h2>Член {article.number}</h2>
          {article.title && <p className="article-subtitle">{article.title}</p>}
          {article.chapter && article.chapter.title && (
            <p className="article-chapter">
              {article.chapter.type} {article.chapter.number} - {article.chapter.title}
            </p>
          )}
        </div>
        <button className="close-btn" onClick={onClose} title="Затвори">
          ✕
        </button>
      </div>

      <div className="panel-content">
        <div className="article-text">
          {article.alineyas && article.alineyas.length > 0 ? (
            article.alineyas.map((al, idx) => (
              <div key={idx} className="alineya">
                {article.alineyas.length > 1 && (
                  <span className="alineya-number">({al.number})</span>
                )}
                <span className="alineya-content">{renderContent(al.content)}</span>
              </div>
            ))
          ) : (
            <p>{renderContent(article.content)}</p>
          )}
        </div>

        {directRefs.length > 0 && (
          <div className="references-section">
            <h3>Преки препратки към:</h3>
            <div className="reference-list">
              {directRefs.map((ref) => (
                <button
                  key={ref}
                  className="reference-badge direct"
                  onClick={() => handleRefClick(ref)}
                  title={gpkData.articles[ref]?.title || ''}
                >
                  Чл. {ref}
                  {gpkData.articles[ref]?.title && (
                    <span className="ref-tooltip">{gpkData.articles[ref].title}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {referencedBy.length > 0 && (
          <div className="references-section">
            <h3>Препратки от:</h3>
            <div className="reference-list">
              {referencedBy.map((ref) => (
                <button
                  key={ref}
                  className="reference-badge incoming"
                  onClick={() => handleRefClick(ref)}
                  title={gpkData.articles[ref]?.title || ''}
                >
                  Чл. {ref}
                  {gpkData.articles[ref]?.title && (
                    <span className="ref-tooltip">{gpkData.articles[ref].title}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {semanticRefs.length > 0 && (
          <div className="references-section">
            <h3>Семантично свързани членове:</h3>
            <div className="reference-list">
              {semanticRefs.map((ref) => (
                <button
                  key={ref}
                  className="reference-badge semantic"
                  onClick={() => handleRefClick(ref)}
                  title={gpkData.articles[ref]?.title || ''}
                >
                  Чл. {ref}
                  {gpkData.articles[ref]?.title && (
                    <span className="ref-tooltip">{gpkData.articles[ref].title}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticlePanel
