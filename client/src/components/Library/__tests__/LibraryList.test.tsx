import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('filters items by search query', async () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    const searchInput = screen.getByRole('searchbox', { name: 'Search library' });
    await userEvent.type(searchInput, 'architecture');

    expect(screen.getByText('architecture-diagram.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Q4 Financial Report.pdf')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of \d+ items/)).toBeInTheDocument();
  });

  it('filters items by type', async () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    const typeDropdown = screen.getByRole('button', { name: /Filter by type/i });
    await userEvent.click(typeDropdown);

    const pdfOption = await screen.findByRole('option', { name: 'PDF' });
    await userEvent.click(pdfOption);

    expect(screen.getByText('Q4 Financial Report.pdf')).toBeInTheDocument();
    expect(screen.getByText('architecture-diagram.pdf')).toBeInTheDocument();
    expect(screen.queryByText('product-mockup-v3.png')).not.toBeInTheDocument();
  });

  it('sorts items by name', async () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    const sortDropdown = screen.getByRole('button', { name: /Sort library items/i });
    await userEvent.click(sortDropdown);

    const nameOption = await screen.findByRole('option', { name: 'Name (A–Z)' });
    await userEvent.click(nameOption);

    const list = screen.getByRole('list', { name: 'Library items' });
    const firstItem = within(list).getAllByRole('listitem')[0];
    expect(firstItem).toHaveTextContent('README.md');
  });

  it('toggles between dense and preview views', async () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    const list = screen.getByRole('list', { name: 'Library items' });
    expect(list).toHaveClass('flex-col');

    const previewButton = screen.getByRole('button', { name: 'Preview grid view' });
    await userEvent.click(previewButton);

    const grid = screen.getByRole('list', { name: 'Library items' });
    expect(grid).toHaveClass('grid');
    expect(screen.getByText('Q4 Financial Report.pdf')).toBeInTheDocument();

    const denseButton = screen.getByRole('button', { name: 'Dense list view' });
    await userEvent.click(denseButton);

    expect(screen.getByRole('list', { name: 'Library items' })).toHaveClass('flex-col');
  });

  it('renders quick actions in dense view', () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    const list = screen.getByRole('list', { name: 'Library items' });
    const firstItem = within(list).getAllByRole('listitem')[0];

    expect(within(firstItem).getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(within(firstItem).getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(within(firstItem).getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(within(firstItem).getByRole('button', { name: 'More options' })).toBeInTheDocument();
  });
});
