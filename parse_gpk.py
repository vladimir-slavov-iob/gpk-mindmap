#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parser for Bulgarian Civil Process Code (ГПК)
Extracts articles, their content, and references to other articles
"""

import re
import json
from typing import Dict, List, Set, Tuple
from collections import defaultdict


class GPKParser:
    def __init__(self, text: str):
        self.text = text
        self.articles = {}
        self.references = defaultdict(set)
        self.semantic_links = defaultdict(set)

    def parse_articles(self) -> Dict:
        """Extract all articles from the text"""
        # Split into lines and process
        lines = self.text.split('\n')

        current_article_num = None
        current_article_content = []
        current_title = ""

        for i, line in enumerate(lines):
            # Skip structure markers (lines starting with #)
            if line.strip().startswith('#'):
                continue

            # Check if this line starts a new article
            article_match = re.match(r'^Чл\.\s*(\d+[а-я]*)\.\s*(.*)$', line)

            if article_match:
                # Save previous article if exists
                if current_article_num is not None:
                    self._save_article(current_article_num, current_title, current_article_content)

                # Start new article
                current_article_num = article_match.group(1)

                # Look backwards for the title (previous non-empty, non-# line)
                title = ""
                for j in range(i - 1, max(0, i - 5), -1):
                    prev_line = lines[j].strip()
                    if prev_line.startswith('#'):
                        continue
                    if prev_line == '':
                        continue
                    # Check it doesn't look like article content (no "(N)" or numbered points)
                    if not re.match(r'^\(\d+\)', prev_line) and not re.match(r'^\d+\.', prev_line):
                        title = prev_line
                        break

                current_title = title
                remaining_text = article_match.group(2)
                current_article_content = [remaining_text] if remaining_text else []
            elif current_article_num is not None:
                # Continue current article content
                current_article_content.append(line)

        # Save last article
        if current_article_num is not None:
            self._save_article(current_article_num, current_title, current_article_content)

        return self.articles

    def _save_article(self, article_num: str, title: str, content_lines: List[str]):
        """Save an article to the articles dictionary"""
        # Join content and clean up
        content = '\n'.join(content_lines).strip()

        # Remove any trailing empty lines or structure markers from content
        content_clean = []
        for line in content.split('\n'):
            if line.strip().startswith('#'):
                break
            content_clean.append(line)

        # Remove trailing empty lines
        while content_clean and not content_clean[-1].strip():
            content_clean.pop()

        content = '\n'.join(content_clean)

        # Parse paragraphs (alineyas)
        alineyas = self.parse_alineyas(content)

        self.articles[article_num] = {
            'number': article_num,
            'title': title,
            'content': content,
            'alineyas': alineyas,
        }

    def parse_alineyas(self, content: str) -> List[Dict]:
        """Parse individual paragraphs (alineyas) within an article"""
        alineyas = []

        # Pattern for alineyas: (1), (2), etc.
        al_pattern = r'\((\d+)\)'
        parts = re.split(al_pattern, content)

        if len(parts) > 1:
            # Multiple alineyas
            for i in range(1, len(parts), 2):
                if i + 1 < len(parts):
                    al_num = parts[i]
                    al_content = parts[i + 1].strip()
                    alineyas.append({
                        'number': al_num,
                        'content': al_content
                    })
        else:
            # Single alineya (no paragraph numbers)
            alineyas.append({
                'number': '1',
                'content': content
            })

        return alineyas

    def find_direct_references(self):
        """Find direct references to other articles (e.g., 'чл. 5', 'ал. 2')"""
        for article_num, article_data in self.articles.items():
            content = article_data['content']

            # Pattern for article references: чл. 123, чл. 5а, чл. 123, ал. 2
            ref_pattern = r'чл\.\s*(\d+[а-я]*?)(?:,\s*ал\.\s*(\d+))?(?:\s|,|\.|\))'

            matches = re.finditer(ref_pattern, content, re.IGNORECASE)

            for match in matches:
                referenced_article = match.group(1)

                # Don't self-reference
                if referenced_article != article_num and referenced_article in self.articles:
                    self.references[article_num].add(referenced_article)

        return dict(self.references)

    def find_semantic_references(self):
        """Find semantic connections based on keywords and topics"""
        # Define keyword groups for semantic matching
        keyword_groups = {
            'съдебен_състав': ['състав', 'съдия', 'председател', 'съвещание', 'гласуване'],
            'страни': ['страна', 'ищец', 'ответник', 'прокурор'],
            'връчване': ['връчване', 'призовка', 'съобщение', 'адрес'],
            'срокове': ['срок', 'изтичане', 'възстановяване', 'продължаване'],
            'представителство': ['представител', 'пълномощие', 'адвокат', 'пълномощник'],
            'такси': ['такса', 'разноски', 'държавна такса', 'възнаграждение'],
            'подведомственост': ['подведомственост', 'компетентност', 'арбитраж'],
            'доказателства': ['доказателство', 'свидетел', 'вещо лице', 'експертиза'],
            'обжалване': ['жалба', 'въззивна', 'касационна', 'обжалване'],
            'процедура': ['производство', 'заседание', 'дело', 'съдебен процес'],
        }

        # Create article-to-keywords mapping
        article_keywords = defaultdict(set)

        for article_num, article_data in self.articles.items():
            content = article_data['content'].lower()
            title = article_data['title'].lower()

            for group_name, keywords in keyword_groups.items():
                for keyword in keywords:
                    if keyword in content or keyword in title:
                        article_keywords[article_num].add(group_name)

        # Create semantic links between articles with shared keywords
        for article_num, keywords in article_keywords.items():
            for other_article, other_keywords in article_keywords.items():
                if article_num != other_article:
                    shared_keywords = keywords & other_keywords
                    if len(shared_keywords) >= 2:  # At least 2 shared topic groups
                        self.semantic_links[article_num].add(other_article)

        return dict(self.semantic_links)

    def export_to_json(self, filepath: str):
        """Export parsed data to JSON format"""
        data = {
            'articles': self.articles,
            'direct_references': {k: list(v) for k, v in self.references.items()},
            'semantic_links': {k: list(v) for k, v in self.semantic_links.items()},
            'metadata': {
                'total_articles': len(self.articles),
                'total_direct_references': sum(len(v) for v in self.references.values()),
                'total_semantic_links': sum(len(v) for v in self.semantic_links.values()),
            }
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return data


def main():
    # Read the GPK text
    with open('gpk_text.txt', 'r', encoding='utf-8') as f:
        gpk_text = f.read()

    # Parse the text
    parser = GPKParser(gpk_text)
    print("Parsing articles...")
    parser.parse_articles()
    print(f"Found {len(parser.articles)} articles")

    # Show a few examples with titles
    print("\nSample articles with titles:")
    for num in ['1', '5', '303', '304']:
        if num in parser.articles:
            art = parser.articles[num]
            print(f"  Чл. {num}: {art['title'][:50]}..." if len(art['title']) > 50 else f"  Чл. {num}: {art['title']}")

    print("\nFinding direct references...")
    parser.find_direct_references()
    print(f"Found {sum(len(v) for v in parser.references.values())} direct references")

    print("Finding semantic links...")
    parser.find_semantic_references()
    print(f"Found {sum(len(v) for v in parser.semantic_links.values())} semantic links")

    # Export to JSON
    print("\nExporting to JSON...")
    parser.export_to_json('src/data/gpk_data.json')
    print("Done!")


if __name__ == '__main__':
    main()
