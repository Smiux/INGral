
import { render, screen } from '@testing-library/react';
import { Textarea } from './Textarea';
import { axe } from 'jest-axe';

describe('Textarea Component Accessibility Tests', () => {
  it('should have no accessibility violations when rendered with basic props', async () => {
    const { container } = render(
      <Textarea
        placeholder="Enter text"
        aria-label="Basic textarea"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with a label', async () => {
    const { container } = render(
      <Textarea
        id="test-textarea"
        label="Test Label"
        placeholder="Enter text"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with error state', async () => {
    const { container } = render(
      <Textarea
        label="Test Label"
        placeholder="Enter text"
        error="This field is required"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with helper text', async () => {
    const { container } = render(
      <Textarea
        label="Test Label"
        placeholder="Enter text"
        helperText="Enter a detailed description"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    
    for (const size of sizes) {
      const { container, unmount } = render(
        <Textarea
          size={size}
          label={`${size} Textarea`}
          placeholder={`Enter text for ${size} textarea`}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      unmount();
    }
  });

  it('should have no accessibility violations when rendered as disabled', async () => {
    const { container } = render(
      <Textarea
        label="Disabled Textarea"
        placeholder="Enter text"
        disabled
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered as required', async () => {
    const { container } = render(
      <Textarea
        label="Required Textarea"
        placeholder="Enter text"
        required
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when focused', async () => {
    const { container } = render(
      <Textarea
        label="Focusable Textarea"
        placeholder="Enter text"
        id="focusable-textarea"
      />
    );
    
    // Focus the textarea
    const textareaElement = screen.getByLabelText('Focusable Textarea');
    textareaElement.focus();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
