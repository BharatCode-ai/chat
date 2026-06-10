import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLibraryItems, mockLibraryStorage } from '~/data/mockLibraryData';
import LibraryList from '../LibraryList';

jest.mock('~/hooks', () => ({
  useDebounce: (value: string) => value,
}));

describe('LibraryList', () => {
  it('renders loading state', () => {
    render(<LibraryList items={[]} status="loading" />);
    expect(screen.getByRole('status', { name: 'Loading library' })).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const onRetry = jest.fn();
    render(
      <LibraryList
        items={[]}
        status="error"
        errorMessage="Network error"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry loading library' })).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<LibraryList items={[]} status="empty" storage={mockLibraryStorage} />);
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
    expect(screen.getByText(/64\.2 MB of 1\.0 GB used/)).toBeInTheDocument();
  });

  it('renders populated list with items', () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByText(`Showing ${mockLibraryItems.length} of ${mockLibraryItems.length} items`)).toBeInTheDocument();
    expect(screen.getByText('Q4 Financial Report.pdf')).toBeInTheDocument();
  });
});