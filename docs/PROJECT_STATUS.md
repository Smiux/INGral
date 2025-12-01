# MyMathWiki Project Status

## Overview
MyMathWiki is a community-based knowledge platform for creating, sharing, and visualizing mathematical concepts with an interactive knowledge graph.

## Database Setup - COMPLETED ✓

### Supabase Connection
- **URL**: https://bwepmavrrpftqdcpuhvr.supabase.co
- **Status**: Connected and operational
- **Client**: Configured in `src/lib/supabase.ts`

### Database Schema

#### Core Tables
1. **articles** - Main wiki articles
   - id, title, slug, content (markdown/LaTeX)
   - author_id (optional), author_name, author_email, author_url
   - created_at, updated_at, view_count
   - visibility ('public', 'community', 'private')
   - allow_contributions, contributors (jsonb)
   - upvotes, comment_count

2. **article_links** - Connections between articles
   - id, source_id, target_id, relationship_type
   - Enforces no self-links and unique connections

3. **tags** - Article categorization
   - id, name, slug, description, created_at

4. **article_tags** - Many-to-many junction table
   - article_id, tag_id

5. **user_graphs** - Knowledge graphs
   - id, title, graph_data (jsonb)
   - author_id (optional), author_name, author_email, author_url
   - is_template, visibility ('public', 'private', 'community')
   - created_at, updated_at

6. **comments** - Article comments
   - id, article_id, parent_id, content
   - author_id (optional), author_name, author_email, author_url
   - created_at, updated_at

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Public read access for public articles and graphs
- Public insert access for anonymous submissions
- Authenticated users can update and delete their own content
- Authors control their own content
- Community contributions allowed where enabled

### Indexes
- Slug-based lookups (articles, tags)
- Recent articles sorting (updated_at)
- Author queries (author_id)
- Graph traversal (article_links source/target)
- Visibility filtering
- Comment article_id indexing

## Application Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **Markdown**: markdown-it
- **Visualization**: D3.js for knowledge graphs
- **Build Tool**: Vite

### Key Features

#### 1. Article Management
- Create, edit, delete articles
- Markdown + LaTeX support
- Wiki-style internal linking `[[Article Title]]`
- Visual LaTeX editor with symbol picker
- Real-time preview
- Anonymous submission support

#### 2. Knowledge Graph Visualization
- Interactive D3.js-based graph
- Node dragging and repositioning
- Custom node creation
- Link management
- Save/load custom graphs
- Template system
- Keyboard shortcuts for efficiency
- Anonymous submission support

#### 3. Community Features
- Article visibility controls (public/community/private)
- Contribution system
- View counts and statistics
- Comment system with anonymous support

#### 4. Tagging System
- Article categorization
- Tag cloud visualization
- Filter articles by tags

### Project Structure
```
├── src/
│   ├── components/            - React components
│   │   ├── articles/           - Article-related components
│   │   │   ├── ArticleEditor.tsx      - Create/edit articles with Markdown + LaTeX
│   │   │   ├── ArticleViewer.tsx      - Display articles with KaTeX rendering
│   │   │   └── index.ts               - Article components export
│   │   ├── canvas/             - Canvas components
│   │   │   ├── Canvas.tsx             - Interactive canvas component
│   │   │   └── index.ts               - Canvas components export
│   │   ├── charts/             - Chart components
│   │   │   ├── BarChart.tsx           - Bar chart component
│   │   │   ├── LineChart.tsx          - Line chart component
│   │   │   ├── PieChart.tsx           - Pie chart component
│   │   │   ├── chartUtils.ts         - Chart utility functions
│   │   │   └── index.ts               - Chart components export
│   │   ├── comments/           - Comment system components
│   │   │   ├── CommentList.tsx        - Comment list component
│   │   │   └── index.ts               - Comment components export
│   │   ├── database/           - Database components
│   │   │   ├── DatabaseManager.tsx    - Database management interface
│   │   │   ├── DatabaseMonitor.tsx    - Database monitoring dashboard
│   │   │   └── index.ts               - Database components export
│   │   ├── editors/            - Editor components
│   │   │   ├── LatexEditor.tsx        - LaTeX formula editor with symbol picker
│   │   │   └── index.ts               - Editor components export
│   │   ├── graph/              - Graph visualization components
│   │   │   ├── GraphVisualization.tsx - D3.js knowledge graph visualization
│   │   │   └── index.ts               - Graph components export
│   │   ├── keyboard/           - Keyboard navigation components
│   │   │   ├── KeyboardShortcuts.tsx  - Keyboard shortcuts component
│   │   │   ├── keyboardUtils.ts       - Keyboard utility functions
│   │   │   └── index.ts               - Keyboard components export
│   │   ├── layout/             - Layout components
│   │   │   ├── Header.tsx             - Navigation header
│   │   │   └── index.ts               - Layout components export
│   │   ├── lazy/               - Lazy loaded components
│   │   │   ├── LazyBarChart.tsx       - Lazy loaded bar chart
│   │   │   ├── LazyGraphVisualization.tsx - Lazy loaded graph visualization
│   │   │   ├── LazyLatexRenderer.tsx  - Lazy loaded LaTeX renderer
│   │   │   ├── LazyPieChart.tsx       - Lazy loaded pie chart
│   │   │   └── index.ts               - Lazy components export
│   │   ├── search/             - Search components
│   │   │   ├── SearchBox.tsx          - Search box component
│   │   │   ├── SearchResults.tsx      - Search results component
│   │   │   └── index.ts               - Search components export
│   │   ├── tags/               - Tag management components
│   │   │   ├── TagList.tsx            - Tag list component
│   │   │   ├── TagSelector.tsx        - Tag selector component
│   │   │   └── index.ts               - Tag components export
│   │   └── ui/                 - UI components
│   │       ├── DataTable.tsx          - Data display component
│   │       ├── DateRangePicker.tsx    - Date range selection component
│   │       ├── ExportButton.tsx       - Export functionality component
│   │       ├── Loader.tsx             - Loading spinner component
│   │       ├── Select.tsx             - Custom select dropdown component
│   │       ├── StatCard.tsx           - Statistics display card
│   │       ├── VirtualList.tsx        - Virtual scrolling list component
│   │       └── index.ts               - UI components export
│   ├── context/               - React context providers
│   │   ├── ThemeContext.tsx        - Theme management context component
│   │   ├── notificationUtils.ts    - Notification utility functions
│   │   ├── themeContext.ts          - Theme context definition
│   │   └── themeUtils.ts           - Theme utility functions
│   ├── hooks/                 - Custom React hooks
│   │   ├── canvasTypes.ts         - Canvas type definitions
│   │   ├── canvasUtils.ts         - Canvas utility functions
│   │   ├── useAccessibility.ts     - Accessibility hook
│   │   ├── useCanvasHook.ts        - Canvas management hook
│   │   └── canvasExports.ts        - Canvas exports aggregation
│   ├── lib/                   - Core libraries
│   │   └── supabase.ts            - Supabase client configuration
│   ├── pages/                 - Application pages
│   │   ├── ArticlesPage.tsx       - Article list page
│   │   ├── DatabasePage.tsx       - Database management page
│   │   ├── GraphListPage.tsx      - Knowledge graphs list
│   │   ├── HomePage.tsx           - Home page
│   │   └── SearchPage.tsx         - Search results page
│   ├── services/              - Service layer
│   │   ├── analyticsService.ts         - Analytics service
│   │   ├── commentService.ts           - Comment system service
│   │   ├── databaseInitService.ts      - Database initialization service
│   │   ├── exportService.ts            - Export functionality service
│   │   ├── fileService.ts              - File handling service
│   │   ├── notificationService.ts      - Notification service
│   │   ├── searchService.ts            - Search service
│   │   ├── tagService.ts               - Tag management service
│   │   └── versionHistoryService.ts    - Version history service
│   ├── styles/                - Global styles
│   │   └── accessibility.css       - Accessibility styles
│   ├── types/                 - TypeScript type definitions
│   │   ├── analytics.ts            - Analytics types
│   │   ├── comment.ts              - Comment types
│   │   ├── css-modules.d.ts        - CSS modules types
│   │   ├── env.d.ts                - Environment variables types
│   │   ├── index.ts                - Main type exports
│   │   ├── notification.ts         - Notification types
│   │   ├── version.ts              - Version history types
│   │   └── virtual-pwa-register.d.ts - PWA register types
│   └── utils/                 - Utility functions
│       ├── accessibility.ts        - Accessibility utilities
│       ├── article.ts              - Article-related utilities
│       ├── cache.ts                - Caching utilities
│       ├── db-data-validator.ts    - Database data validation
│       ├── db-logger.ts            - Database logging
│       ├── db-optimization.ts      - Database optimization
│       ├── katexFontOptimizer.ts   - KaTeX font optimization
│       ├── keyboardNavigation.ts   - Keyboard navigation utilities
│       ├── markdown.ts             - Markdown processing
│       ├── registerSW.ts           - Service worker registration
│       └── sitemapGenerator.ts     - Sitemap generation
```

## Development Status

### Recently Completed Optimizations ✓
- **Accessibility Improvements** - Enhanced keyboard navigation and screen reader support
- **Type Safety Enhancements** - Fixed type checking errors across the codebase
- **Service Layer Refactoring** - Improved service architecture and error handling
- **Database Monitoring** - Added database health checks and monitoring
- **Code Documentation** - Enhanced JSDoc comments for better developer experience
- **Performance Optimization** - Added caching mechanisms and improved loading times
- **Export Functionality** - Added article export capabilities
- **Version History** - Implemented article version control
- **Content Review System** - Implemented complete content review mechanism
- **Mathematical Calculation** - Integrated SymPy for mathematical calculations
- **3D Visualization** - Added Three.js-based 3D graph rendering
- **Database Structure Updates** - Added review-related tables and fields

### Core Features Completed ✓
- Database schema and migrations
- Supabase integration with real database
- Article CRUD operations with Markdown + LaTeX support
- Wiki-style internal linking `[[Article Title]]`
- Interactive knowledge graph visualization with D3.js
- Anonymous submission support for articles and graphs
- Community features (visibility controls, contributions)
- LaTeX editor with symbol picker and real-time preview
- Responsive design for all screen sizes
- Search functionality with filtering
- Notification system
- Keyboard shortcuts for efficiency
- Content review mechanism with accuracy scoring
- SymPy integration for mathematical calculations
- Three.js-based 3D graph rendering
- Complete database monitoring and health checks

### Ready for Development
The application is fully configured and ready for:
1. Creating articles with anonymous submission
2. Building knowledge graphs with anonymous submission
3. Community collaboration
4. Adding new features

## Getting Started

### Environment Setup
```bash
# Install dependencies
npm install

# Environment variables are already configured in .env:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Development
```bash
# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Database Migrations
All migrations are already applied to the Supabase database:
1. `20251130_complete_database.sql` - Complete database structure with anonymous submission support
   - Core tables (articles, user_graphs, comments, tags)
   - Anonymous submission support with author fields
   - Indexes, functions, triggers, and RLS policies
   - Full-text search functionality
   - Article version history

2. `20251201_content_review.sql` - Content review enhancements
   - Added review-related fields to articles and article_versions tables
   - Created article_reviews table for audit logging
   - Added appropriate indexes for review functionality
   - Implemented RLS policies for review operations

### Database Initialization
The application includes automatic database initialization through `databaseInitService.ts`, which:
- Verifies table existence
- Checks for required indexes
- Ensures proper RLS policies
- Validates database integrity

### Services Architecture
The application uses a service layer architecture with dedicated services for:
- Article operations (`article.ts` in utils)
- Search functionality (`searchService.ts`)
- Notification system (`notificationService.ts`)
- Version control (`versionHistoryService.ts`)
- Analytics tracking (`analyticsService.ts`)
- Database monitoring (`databaseInitService.ts`)
- Comment system (`commentService.ts`)
- Tag management (`tagService.ts`)

## API Integration

### Supabase Client Usage
```typescript
import { supabase } from '@/lib/supabase';

// Query articles
const { data, error } = await supabase
  .from('articles')
  .select('*')
  .eq('visibility', 'public');

// Create article with anonymous submission
const { data, error } = await supabase
  .from('articles')
  .insert({
    title: 'My Article',
    slug: 'my-article',
    content: '# Content',
    author_name: 'Anonymous', // Optional: leave empty for anonymous
    visibility: 'public'
  });

// Create article with author information
const { data, error } = await supabase
  .from('articles')
  .insert({
    title: 'My Article',
    slug: 'my-article',
    content: '# Content',
    author_name: 'John Doe',
    author_email: 'john@example.com',
    author_url: 'https://example.com',
    visibility: 'public'
  });
```

## Performance Considerations

### Current Bundle Size
- Main bundle: ~906 KB (280 KB gzipped)
- KaTeX fonts: ~500 KB total
- Consider code-splitting for optimization

### Database Performance
- All critical queries have indexes
- RLS policies optimized for common access patterns
- JSONB used for flexible graph storage

## Security

### Authorization
- Row Level Security on all tables
- Policy-based access control
- Public insert access for anonymous submissions
- Authenticated users can update and delete their own content
- Private articles only visible to author

### Data Validation
- Client-side validation in forms
- Server-side validation via RLS policies
- SQL injection prevention via parameterized queries

## Next Steps

### Recommended Enhancements
1. **Comments System** - Add article comments
2. **Tags & Categories** - Implement tag filtering
3. **Search Enhancement** - Full-text search with PostgreSQL
4. **Notifications** - Content update notifications
5. **Export Features** - PDF/Markdown export
6. **Mobile App** - React Native version
7. **Real-time Collaboration** - WebSocket-based editing
8. **Version History** - Track article changes
9. **Analytics** - Usage statistics dashboard
10. **API Documentation** - OpenAPI spec

### Performance Optimization
1. Implement code splitting for routes
2. Lazy load heavy components (graph, LaTeX)
3. Add service worker for offline support
4. Optimize KaTeX font loading
5. Implement virtual scrolling for large lists

### SEO & Accessibility
1. Add meta tags for sharing
2. Implement sitemap generation
3. Add ARIA labels
4. Keyboard navigation improvements
5. Screen reader optimization

## Troubleshooting

### Common Issues

**Database Connection Fails**
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check network connectivity

**Build Errors**
- Run `npm install` to update dependencies
- Clear cache: `rm -rf node_modules .vite`
- Verify TypeScript configuration

**RLS Policy Errors**
- Verify policy conditions match your use case
- Review policy with `mcp__supabase__execute_sql`

## Contributing Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns
- Add proper error handling
- Include loading states
- Write meaningful commit messages

### Testing
- Verify RLS policies work correctly
- Test on multiple browsers
- Check mobile responsiveness
- Validate accessibility

## License & Credits

Built with:
- React & TypeScript
- Supabase (PostgreSQL)
- D3.js for visualizations
- KaTeX for math rendering
- Tailwind CSS for styling

---

**Project Status**: Production Ready ✓
**Last Updated**: 2025-11-30
**Database**: Connected and operational with real data
**Type Checking**: Passing ✅
**Build**: Successful ✅
**Accessibility**: Enhanced keyboard navigation and screen reader support
**Performance**: Optimized with caching and lazy loading
**Code Quality**: Improved with TypeScript strict mode and comprehensive documentation