# ГПК Mind Map - Project Summary

## Overview

An interactive web application that visualizes the Bulgarian Civil Process Code (Граждански процесуален кодекс) as a mind map, showing both direct references between articles and semantic connections based on content analysis.

## Project Structure

```
gpk-mindmap/
├── parse_gpk.py                 # Python parser for extracting articles and references
├── gpk_text.txt                 # Full text of the Civil Process Code
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Main application component
│   ├── App.css                  # Main application styles
│   ├── components/
│   │   ├── MindMap.jsx          # Interactive mind map visualization
│   │   ├── MindMap.css
│   │   ├── CustomNode.jsx       # Custom node component for articles
│   │   ├── CustomNode.css
│   │   ├── ArticlePanel.jsx     # Article details panel
│   │   ├── ArticlePanel.css
│   │   ├── SearchBar.jsx        # Search functionality
│   │   └── SearchBar.css
│   └── data/
│       └── gpk_data.json        # Parsed data (articles, references, links)
├── public/
├── index.html                   # HTML entry point
├── package.json                 # NPM dependencies and scripts
├── vite.config.js              # Vite configuration
├── README.md                    # User documentation
├── SETUP.md                     # Setup instructions
├── demo.html                    # Static demo page
└── PROJECT_SUMMARY.md           # This file

```

## Key Features

### 1. Data Parsing (parse_gpk.py)

- **Article Extraction**: Parses the full text of ГПК and extracts:
  - Article numbers and titles
  - Full content with paragraphs (alineyas)
  - Chapter and section information

- **Direct References**: Detects explicit references to other articles
  - Pattern: "чл. 5", "чл. 123, ал. 2", etc.
  - Found: 19 direct references

- **Semantic Links**: Identifies semantically related articles based on:
  - Keyword matching (10 topic groups)
  - Content similarity
  - Found: 1,096 semantic connections

- **Output**: Generates `gpk_data.json` with structured data

### 2. Mind Map Visualization (MindMap.jsx)

- **Technology**: React Flow for graph visualization
- **Layout**: Dagre algorithm for automatic node positioning
- **Features**:
  - Zoom and pan controls
  - Mini-map for overview
  - Node highlighting on selection
  - Different edge styles for direct vs semantic links
  - Responsive design

### 3. Article Display (ArticlePanel.jsx)

- **Content Display**:
  - Article number and title
  - Chapter context
  - Full text with paragraphs
  - Clickable references in text

- **Reference Sections**:
  - Direct outgoing references (blue badges)
  - Incoming references (green badges)
  - Semantic connections (gray badges)
  - Tooltips with article titles

### 4. Search Functionality (SearchBar.jsx)

- **Real-time search** across:
  - Article numbers
  - Titles
  - Full content

- **Features**:
  - Instant results
  - Highlighted matching text
  - Preview of article content
  - Click to navigate

## Technical Implementation

### Frontend Stack

- **React 18**: Modern UI library
- **Vite**: Fast build tool and dev server
- **React Flow**: Graph visualization library
- **Dagre**: Graph layout algorithm

### Data Processing

- **Python 3**: Text parsing and analysis
- **Regex**: Pattern matching for references
- **JSON**: Data storage format

### Styling

- **CSS3**: Custom styling with variables
- **Flexbox/Grid**: Responsive layouts
- **Transitions**: Smooth animations

## Data Model

### Articles

```json
{
  "number": "1",
  "title": "Предмет",
  "content": "Full article text...",
  "alineyas": [
    {
      "number": "1",
      "content": "Paragraph text..."
    }
  ],
  "chapter": {
    "type": "Глава",
    "number": "първа",
    "title": "ОСНОВНИ ПОЛОЖЕНИЯ"
  }
}
```

### References

```json
{
  "direct_references": {
    "28": ["4"]  // Article 28 references Article 4
  },
  "semantic_links": {
    "1": ["2", "3", "14"]  // Article 1 is semantically linked to 2, 3, 14
  }
}
```

## User Interface

### Header
- Application title
- Search bar
- Semantic links toggle

### Main Content Area
- Interactive mind map (left/full width)
- Article details panel (right, collapsible)

### Mind Map Controls
- Zoom in/out
- Fit view
- Mini-map for navigation

### Article Panel
- Close button
- Article header with context
- Full article text
- Reference sections
- Navigation buttons

## Workflow

1. **Data Preparation**:
   ```bash
   python3 parse_gpk.py
   ```
   - Reads `gpk_text.txt`
   - Generates `src/data/gpk_data.json`

2. **Development**:
   ```bash
   npm install
   npm run dev
   ```
   - Starts Vite dev server
   - Opens browser at http://localhost:3000

3. **Production Build**:
   ```bash
   npm run build
   ```
   - Generates optimized static files in `dist/`
   - Can be deployed to any static hosting

## Customization

### Adding New Keyword Groups

Edit `parse_gpk.py`:

```python
keyword_groups = {
    'your_topic': ['keyword1', 'keyword2', ...],
    # ...
}
```

### Styling

- Modify CSS files in `src/components/`
- Update theme colors in `App.css`
- Adjust node styles in `CustomNode.css`

### Layout

Change graph layout in `MindMap.jsx`:

```javascript
dagreGraph.setGraph({
  rankdir: 'TB',  // TB, LR, BT, RL
  nodesep: 100,
  ranksep: 150
})
```

## Performance Considerations

- **Lazy loading**: Only visible nodes are rendered
- **Memoization**: CustomNode component is memoized
- **Semantic links limit**: Max 3 per article in visualization
- **Search results limit**: Max 20 results displayed

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox

## Future Enhancements

Potential features to add:

1. **Filter by chapter/section**
2. **Export graph as image**
3. **Print-friendly view**
4. **Bookmark favorite articles**
5. **History of visited articles**
6. **Share link to specific article**
7. **Dark mode**
8. **Multi-language support**
9. **Comparison with previous versions**
10. **Comments/annotations**

## Credits

Built with Claude Code
Powered by:
- React
- React Flow
- Vite
- Python

---

## License

This program is slop. I'm not sure whether I can have any claim of copyright over it, since I merely steered Claude into building it. And wihout copyright, the question of licensing is meaningless.

However, if I do have a copyright, you can use the it under [AGPL-3.0](./LICENSE).
