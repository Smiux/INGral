
import { render, screen } from '@testing-library/react';
import { Input } from './Input';
import { axe } from 'jest-axe';

describe('Input Component Accessibility Tests', () => {
  it('should have no accessibility violations when rendered with basic props', async () => {
    const { container } = render(
      <Input
        placeholder="Enter text"
        aria-label="Basic input"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with a label', async () => {
    const { container } = render(
      <Input
        id="test-input"
        label="Test Label"
        placeholder="Enter text"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with error state', async () => {
    const { container } = render(
      <Input
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
      <Input
        label="Test Label"
        placeholder="Enter text"
        helperText="Enter at least 8 characters"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered with different sizes', async () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    
    for (const size of sizes) {
      const { container, unmount } = render(
        <Input
          size={size}
          label={`${size} Input`}
          placeholder={`Enter text for ${size} input`}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      unmount();
    }
  });

  it('should have no accessibility violations when rendered as disabled', async () => {
    const { container } = render(
      <Input
        label="Disabled Input"
        placeholder="Enter text"
        disabled
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when rendered as required', async () => {
    const { container } = render(
      <Input
        label="Required Input"
        placeholder="Enter text"
        required
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when focused', async () => {
    const { container } = render(
      <Input
        label="Focusable Input"
        placeholder="Enter text"
        id="focusable-input"
      />
    );
    
    // Focus the input
    const inputElement = screen.getByLabelText('Focusable Input');
    inputElement.focus();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
