import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Comment } from './Comment';
import type { Comment as CommentType } from '../../types';
import { CommentStatus } from '../../types';
import { commentService } from '../../services/commentService';

// Mock the commentService
jest.mock('../../services/commentService');

const mockCommentService = commentService as jest.Mocked<typeof commentService>;

// Mock comment data
const mockComment: CommentType = {
  id: 'test-comment-id',
  article_id: 'test-article-id',
  content: 'Test comment content',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  author_name: 'Test Author',
  author_email: 'test@example.com',
  author_url: 'https://example.com',
  upvotes: 5,
  downvotes: 1,
  is_deleted: false,
  parent_id: null,
  status: CommentStatus.APPROVED,
};

describe('Comment Component', () => {
  const mockOnCommentAdded = jest.fn();
  const mockOnCommentDeleted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCommentService.upvoteComment.mockResolvedValue(true);
    mockCommentService.downvoteComment.mockResolvedValue(true);
    mockCommentService.deleteComment.mockResolvedValue(true);
    mockCommentService.createComment.mockResolvedValue({
      ...mockComment,
      id: 'new-comment-id',
      parent_id: mockComment.id,
      content: 'Test reply content',
      created_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
    });
  });

  it('should render comment correctly', () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Check if comment author is displayed
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    
    // Check if comment content is displayed
    expect(screen.getByText('Test comment content')).toBeInTheDocument();
    
    // Check if vote counts are displayed
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Check if reply button is displayed
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('should show reply form when reply button is clicked', () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByText('Reply'));
    
    // Check if reply form is displayed
    expect(screen.getByPlaceholderText('Write your reply...')).toBeInTheDocument();
    expect(screen.getByText('Submit Reply')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should hide reply form when cancel button is clicked', () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click reply button to show form
    fireEvent.click(screen.getByText('Reply'));
    expect(screen.getByPlaceholderText('Write your reply...')).toBeInTheDocument();
    
    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check if reply form is hidden
    expect(screen.queryByPlaceholderText('Write your reply...')).not.toBeInTheDocument();
  });

  it('should submit reply when submit button is clicked', async () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByText('Reply'));
    
    // Enter reply content
    const replyTextarea = screen.getByPlaceholderText('Write your reply...') as HTMLTextAreaElement;
    fireEvent.change(replyTextarea, { target: { value: 'Test reply content' } });
    
    // Click submit button
    fireEvent.click(screen.getByText('Submit Reply'));
    
    // Check if createComment was called
    await waitFor(() => {
      expect(mockCommentService.createComment).toHaveBeenCalledWith(
        mockComment.article_id,
        'Test reply content',
        mockComment.id
      );
    });
    
    // Check if onCommentAdded was called
    await waitFor(() => {
      expect(mockOnCommentAdded).toHaveBeenCalled();
    });
    
    // Check if reply form is hidden after submission
    expect(screen.queryByPlaceholderText('Write your reply...')).not.toBeInTheDocument();
  });

  it('should call upvoteComment when upvote button is clicked', async () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click upvote button
    const upvoteElements = screen.getAllByText('5');
    expect(upvoteElements.length).toBeGreaterThan(0);
    const upvoteElement = upvoteElements[0] as HTMLElement;
    const upvoteButton = upvoteElement.closest('button') as HTMLButtonElement | null;
    expect(upvoteButton).not.toBeNull();
    if (upvoteButton) {
      fireEvent.click(upvoteButton);
    }
    
    // Check if upvoteComment was called
    await waitFor(() => {
      expect(mockCommentService.upvoteComment).toHaveBeenCalledWith(mockComment.id);
    });
    
    // Check if onCommentAdded was called
    await waitFor(() => {
      expect(mockOnCommentAdded).toHaveBeenCalled();
    });
  });

  it('should call downvoteComment when downvote button is clicked', async () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click downvote button
    const downvoteElements = screen.getAllByText('1');
    expect(downvoteElements.length).toBeGreaterThan(0);
    const downvoteElement = downvoteElements[0] as HTMLElement;
    const downvoteButton = downvoteElement.closest('button') as HTMLButtonElement | null;
    expect(downvoteButton).not.toBeNull();
    if (downvoteButton) {
      fireEvent.click(downvoteButton);
    }
    
    // Check if downvoteComment was called
    await waitFor(() => {
      expect(mockCommentService.downvoteComment).toHaveBeenCalledWith(mockComment.id);
    });
    
    // Check if onCommentAdded was called
    await waitFor(() => {
      expect(mockOnCommentAdded).toHaveBeenCalled();
    });
  });

  it('should call deleteComment when delete button is clicked', async () => {
    // Mock window.confirm to return true
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click delete button
    fireEvent.click(screen.getByTitle('Delete Comment'));
    
    // Check if deleteComment was called
    await waitFor(() => {
      expect(mockCommentService.deleteComment).toHaveBeenCalledWith(mockComment.id);
    });
    
    // Check if onCommentDeleted was called
    await waitFor(() => {
      expect(mockOnCommentDeleted).toHaveBeenCalled();
    });
  });

  it('should not call deleteComment when delete button is clicked and user cancels', async () => {
    // Mock window.confirm to return false
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Click delete button
    fireEvent.click(screen.getByTitle('Delete Comment'));
    
    // Check if deleteComment was not called
    await waitFor(() => {
      expect(mockCommentService.deleteComment).not.toHaveBeenCalled();
    });
    
    // Check if onCommentDeleted was not called
    await waitFor(() => {
      expect(mockOnCommentDeleted).not.toHaveBeenCalled();
    });
  });

  it('should have correct accessibility attributes', () => {
    render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    // Check if buttons have correct ARIA attributes
    expect(screen.getByTitle('Delete Comment')).toHaveAttribute('aria-label', 'Delete Comment');
    
    const replyButton = screen.getByText('Reply').closest('button');
    expect(replyButton).toHaveAttribute('title', 'Reply');
    
    const upvoteElements = screen.getAllByText('5');
    expect(upvoteElements.length).toBeGreaterThan(0);
    const upvoteElement = upvoteElements[0] as HTMLElement;
    const upvoteButton = upvoteElement.closest('button');
    expect(upvoteButton).not.toBeNull();
    if (upvoteButton) {
      expect(upvoteButton).toHaveAttribute('title', '');
    }
    
    const downvoteElements = screen.getAllByText('1');
    expect(downvoteElements.length).toBeGreaterThan(0);
    const downvoteElement = downvoteElements[0] as HTMLElement;
    const downvoteButton = downvoteElement.closest('button');
    expect(downvoteButton).not.toBeNull();
    if (downvoteButton) {
      expect(downvoteButton).toHaveAttribute('title', '');
    }
  });

  it('should apply hover effects correctly', () => {
    const { container } = render(
      <Comment
        comment={mockComment}
        articleId={mockComment.article_id}
        onCommentAdded={mockOnCommentAdded}
        onCommentDeleted={mockOnCommentDeleted}
      />
    );

    const commentElement = container.firstChild as HTMLElement;
    
    // Check initial styles
    expect(commentElement).not.toHaveClass('shadow-md');
    
    // Simulate hover
    fireEvent.mouseEnter(commentElement);
    
    // Check if hover styles are applied
    expect(commentElement).toHaveClass('shadow-md');
    
    // Simulate mouse leave
    fireEvent.mouseLeave(commentElement);
    
    // Check if hover styles are removed
    expect(commentElement).not.toHaveClass('shadow-md');
  });
});
