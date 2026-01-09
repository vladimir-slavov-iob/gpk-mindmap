# Changelog - v2.0

## Major Updates

### Complete Dataset (v2.0 - 2026-01-04)

The application has been updated with the complete text of the Bulgarian Civil Process Code (ГПК).

#### Data Statistics

**Before (v1.0):**
- 81 articles (partial text up to Art. 78)
- 19 direct references
- 1,096 semantic links

**After (v2.0):**
- **717 articles** (complete text including all articles and additional clauses)
- **613 direct references**
- **56,282 semantic links**

#### Bug Fixes

1. **Search Functionality Fixed**
   - Issue: Clicking on search results did nothing
   - Fix: Added `onArticleSelect` callback to properly open the article panel when clicking search results
   - Files changed:
     - [src/App.jsx](src/App.jsx) - Added callback prop
     - [src/components/SearchBar.jsx](src/components/SearchBar.jsx) - Implemented article selection on click

2. **Performance Optimization**
   - Issue: Rendering 717 nodes at once would be very slow
   - Fix: Implemented focused view strategy:
     - **Default view**: Shows first 100 articles for overview
     - **Selected article view**: Shows selected article + all connected articles (direct references + incoming references + semantic links)
     - **Search results view**: Shows only matching articles
   - Files changed:
     - [src/components/MindMap.jsx](src/components/MindMap.jsx) - Smart node filtering based on context

#### Technical Improvements

1. **Smart Node Selection**
   ```javascript
   // Shows relevant nodes based on context:
   - Search results: Only highlighted articles
   - Selected article: Article + connections (10-50 nodes typically)
   - Default: First 100 articles
   ```

2. **Edge Filtering**
   - Only shows connections between visible nodes
   - Reduces clutter and improves performance
   - Semantic links limited to 3-10 per article when enabled

3. **Dynamic Layout**
   - Layout recalculates when switching between articles
   - Ensures optimal visualization for each context

## User Experience Enhancements

### Navigation Flow

1. **Initial Load**
   - Shows overview of first 100 articles
   - User can search or browse

2. **Search**
   - Type query → See matching articles
   - Click result → Article panel opens + mind map focuses on that article

3. **Article Selection**
   - Click article node → Panel opens with full details
   - Mind map updates to show only related articles
   - Click references in panel → Navigate to connected articles

4. **Exploration**
   - Follow reference chains by clicking
   - Toggle semantic links to discover related content
   - Use search to jump to specific articles

## Files Updated

### Core Application
- ✅ [src/App.jsx](src/App.jsx) - Added article selection callback
- ✅ [src/components/SearchBar.jsx](src/components/SearchBar.jsx) - Fixed search click handler
- ✅ [src/components/MindMap.jsx](src/components/MindMap.jsx) - Optimized for large dataset

### Data
- ✅ [gpk_text.txt](gpk_text.txt) - Updated with complete GPK text (717 articles)
- ✅ [src/data/gpk_data.json](src/data/gpk_data.json) - Re-parsed with complete data

### Documentation
- ✅ [README.md](README.md) - Updated statistics and features
- ✅ [demo.html](demo.html) - Updated statistics
- ✅ [CHANGES.md](CHANGES.md) - This file

## Migration Notes

If you had the previous version:

1. **Re-parse required**: The data file has been regenerated
   ```bash
   python3 parse_gpk.py
   ```

2. **No breaking changes**: The UI and API remain the same

3. **Better performance**: Despite 9x more articles, performance is better due to focused views

## Next Steps

To run the updated application:

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The application will open at http://localhost:3000

## Known Limitations

1. **Initial overview**: Limited to 100 articles to maintain performance
2. **Semantic links**: Limited to top 10 connections per article when viewing
3. **Layout**: Can take 1-2 seconds to calculate for large connected graphs (50+ nodes)

These are intentional trade-offs for better user experience and performance.

## Future Enhancements

Potential improvements for future versions:

- [ ] Virtual scrolling for very large result sets
- [ ] Progressive loading of connected nodes
- [ ] Search within specific chapters/sections
- [ ] Filter by article type or topic
- [ ] Export selected subgraph as image
- [ ] Persistent URL state (shareable links)
- [ ] History/breadcrumb trail of visited articles
