# Comments Components

This directory contains components for displaying and managing comments on articles.

## Components

### Comment
A single comment component that displays a comment with options to reply, upvote, downvote, and delete.

**Props:**
- `comment`: The comment data object
- `articleId`: The ID of the article the comment belongs to
- `onCommentAdded`: Callback when a new comment is added
- `onCommentDeleted`: Callback when a comment is deleted

**Features:**
- Displays comment author, content, and timestamp
- Supports replying to comments
- Supports upvoting and downvoting
- Supports deleting comments
- Responsive design
- Accessibility compliant

### CommentsSection
A section component that displays all comments for an article and provides a form to add new comments.

**Props:**
- `articleId`: The ID of the article to display comments for

**Features:**
- Loads and displays all comments for an article
- Groups comments by parent-child relationships
- Provides a form to add new comments
- Displays loading state while comments are being fetched
- Handles empty states gracefully

## Usage

```tsx
import { CommentsSection } from './CommentsSection';

function ArticleViewer({ article }) {
  return (
    <div>
      {/* Article content */}
      <article>
        {/* Article body */}
      </article>
      
      {/* Comments section */}
      <CommentsSection articleId={article.id} />
    </div>
  );
}
```

## Styling

All components use Tailwind CSS for styling and follow the project's design system. They support both light and dark modes.

## Accessibility

- All interactive elements have proper ARIA attributes
- Keyboard navigation is supported
- Focus management is implemented
- Screen reader friendly
- High contrast for better readability

## Performance

- Comments are loaded with caching to reduce API calls
- Comments are rendered efficiently with proper key usage
- Infinite scrolling can be implemented for large comment threads

## Integration

These components integrate with the `commentService` to handle comment-related API calls:
- Creating comments
- Loading comments
- Upvoting and downvoting
- Deleting comments

## Testing

Unit tests are available for these components, covering:
- Rendering with different props
- Interaction handling
- Accessibility compliance
- Edge cases
