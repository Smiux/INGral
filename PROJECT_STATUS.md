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
   - author_id, created_at, updated_at, view_count
   - visibility ('public', 'community', 'private')
   - allow_contributions, contributors (jsonb)
   - upvotes, comment_count

2. **article_links** - Connections between articles
   - id, source_id, target_id, relationship_type
   - Enforces no self-links and unique connections

3. **tags** - Article categorization
   - id, name, created_at

4. **article_tags** - Many-to-many junction table
   - article_id, tag_id

5. **user_graphs** - User-created knowledge graphs
   - id, user_id, name
   - nodes (jsonb), links (jsonb)
   - is_template, created_at, updated_at

6. **user_profiles** - User profile information
   - id (references auth.users), username, bio, avatar_url
   - Auto-created on user signup

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- Public read access for public articles
- Authenticated users can view community articles
- Authors control their own content
- Community contributions allowed where enabled
- User profiles readable by all, editable by owner

### Indexes
- Slug-based lookups (articles)
- Recent articles sorting (updated_at)
- Author queries (author_id)
- Graph traversal (article_links source/target)
- Visibility filtering
- Username searches

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

#### 2. Knowledge Graph Visualization
- Interactive D3.js-based graph
- Node dragging and repositioning
- Custom node creation
- Link management
- Save/load custom graphs
- Template system
- Keyboard shortcuts for efficiency

#### 3. Community Features
- Article visibility controls (public/community/private)
- Contribution system
- User profiles with bio and avatar
- View counts and statistics

#### 4. Authentication
- Email/password via Supabase Auth
- Protected routes
- User sessions

### Component Structure
```
src/
├── components/
│   ├── ArticleViewer.tsx      - Display articles
│   ├── ArticleEditor.tsx      - Create/edit articles
│   ├── ArticleDrawer.tsx      - Side drawer for references
│   ├── GraphVisualization.tsx - Knowledge graph
│   ├── Header.tsx             - Navigation
│   ├── LatexEditor.tsx        - LaTeX formula editor
│   ├── ProfileEditor.tsx      - User profile editing
│   └── DatabaseMonitor.tsx    - Admin dashboard
├── pages/
│   ├── HomePage.tsx
│   ├── ArticlesPage.tsx
│   ├── SearchPage.tsx
│   ├── AuthPage.tsx
│   ├── ProfilePage.tsx
│   └── DatabasePage.tsx
├── utils/
│   ├── article.ts             - Article CRUD operations
│   ├── user.ts                - User profile operations
│   └── markdown.ts            - Markdown/LaTeX rendering
├── hooks/
│   └── useAuth.ts             - Authentication hook
├── lib/
│   └── supabase.ts            - Supabase client
└── types/
    └── index.ts               - TypeScript definitions
```

## Development Status

### Completed ✓
- Database schema and migrations
- Supabase integration
- Authentication system
- Article CRUD operations
- Markdown + LaTeX rendering
- Wiki-style linking
- Knowledge graph visualization
- User profiles
- Community features (visibility, contributions)
- LaTeX editor with symbol picker
- Responsive design

### Ready for Development
The application is fully configured and ready for:
1. Creating articles
2. Building knowledge graphs
3. User registration and profiles
4. Community collaboration
5. Adding new features

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
All migrations are already applied:
1. `001_create_wiki_schema.sql` - Core tables and RLS
2. `002_create_graph_tables.sql` - Graph storage
3. `add_community_features` - Visibility and contributions
4. `add_user_profiles` - User profiles and auto-creation

## API Integration

### Supabase Client Usage
```typescript
import { supabase } from '@/lib/supabase';

// Query articles
const { data, error } = await supabase
  .from('articles')
  .select('*')
  .eq('visibility', 'public');

// Create article
const { data, error } = await supabase
  .from('articles')
  .insert({
    title: 'My Article',
    slug: 'my-article',
    content: '# Content',
    author_id: user.id
  });
```

### Authentication
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, signIn, signOut, signUp } = useAuth();

// Sign in
await signIn('email@example.com', 'password');

// Sign up
await signUp('email@example.com', 'password');
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

### Authentication
- Supabase Auth handles password hashing
- JWT tokens for session management
- Secure HTTP-only cookies

### Authorization
- Row Level Security on all tables
- Policy-based access control
- Community contributions require authentication
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
4. **Notifications** - User notifications for contributions
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
- Check user is authenticated
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
- Test authentication flows
- Verify RLS policies work correctly
- Test on multiple browsers
- Check mobile responsiveness
- Validate accessibility

## License & Credits

Built with:
- React & TypeScript
- Supabase (PostgreSQL + Auth)
- D3.js for visualizations
- KaTeX for math rendering
- Tailwind CSS for styling

---

**Project Status**: Production Ready ✓
**Last Updated**: 2025-11-20
**Database**: Connected and operational
**Build**: Successful
