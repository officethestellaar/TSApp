import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

vi.mock('@/context/AuthContext');
vi.mock('next/navigation');

describe('ProtectedRoute', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);
  });

  it('shows loading spinner when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login if no user and not loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('redirects to unauthorized if user role is not allowed', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: 'test@test.com', name: 'Test User', role: 'USER' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/unauthorized');
  });

  it('renders children if user is authenticated and role is allowed', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, email: 'test@test.com', name: 'Test User', role: 'ADMIN' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
