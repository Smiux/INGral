
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button component accessibility tests', () => {
  it('should have no accessibility violations when rendered', async () => {
    const { container } = render(
      <Button variant="primary" size="md" aria-label="Test button">
        Click me
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when disabled', async () => {
    const { container } = render(
      <Button variant="primary" size="md" disabled aria-label="Disabled button">
        Disabled
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with different variants', async () => {
    const variants: Array<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'> = [
      'primary',
      'secondary',
      'success',
      'warning',
      'error',
      'outline',
    ];

    for (const variant of variants) {
      const { container, unmount } = render(
        <Button variant={variant} size="md" aria-label={`${variant} button`}>
          {variant} Button
        </Button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
      unmount();
    }
  });

  it('should have no accessibility violations with different sizes', async () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

    for (const size of sizes) {
      const { container, unmount } = render(
        <Button variant="primary" size={size} aria-label={`${size} button`}>
          {size.toUpperCase()} Button
        </Button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
      unmount();
    }
  });

  it('should have no accessibility violations when loading', async () => {
    const { container } = render(
      <Button variant="primary" size="md" loading aria-label="Loading button">
        Loading
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with full width', async () => {
    const { container } = render(
      <Button variant="primary" size="md" fullWidth aria-label="Full width button">
        Full Width Button
      </Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus management', async () => {
    render(
      <Button variant="primary" size="md" aria-label="Focusable button">
        Focusable Button
      </Button>
    );

    const button = screen.getByRole('button', { name: /focusable button/i });
    expect(button).toBeTruthy();
    
    // 检查按钮初始状态下是否没有焦点
    expect(document.activeElement).not.toBe(button);

    // 给按钮添加焦点
    button.focus();
    
    // 检查按钮是否获得了焦点
    expect(document.activeElement).toBe(button);
  });
});
