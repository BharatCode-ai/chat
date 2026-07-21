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
    expect(firstItem).toHaveTextContent('api-client.ts');
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
    expect(screen.getByRole('group', { name: 'Library view' })).toBeInTheDocument();

    const previewButton = screen.getByRole('button', { name: 'Preview grid view' });
    await userEvent.click(previewButton);

    const grid = screen.getByRole('list', { name: 'Library items' });
    expect(grid).toHaveClass('grid');
    expect(screen.getByText('Q4 Financial Report.pdf')).toBeInTheDocument();
    const firstCard = within(grid).getAllByRole('listitem')[0];
    expect(within(firstCard).queryByRole('button')).not.toBeInTheDocument();

    const denseButton = screen.getByRole('button', { name: 'Dense list view' });
    await userEvent.click(denseButton);

    expect(screen.getByRole('list', { name: 'Library items' })).toHaveClass('flex-col');
  });

  it('does not render quick actions without callbacks', () => {
    render(
      <LibraryList
        items={mockLibraryItems}
        status="populated"
        storage={mockLibraryStorage}
      />,
    );

    expect(screen.queryByRole('group', { name: 'Quick actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument();
  });

  it('renders and invokes only configured quick actions', async () => {
    const onItemClick = jest.fn();
    const onDownload = jest.fn();
    const onShare = jest.fn();
    const onMore = jest.fn();
    const item = mockLibraryItems[0];

    render(
      <LibraryList
        items={[item]}
        status="populated"
        onItemClick={onItemClick}
        onDownload={onDownload}
        onShare={onShare}
        onMore={onMore}
      />,
    );

    const quickActions = screen.getByRole('group', { name: 'Quick actions' });
    await userEvent.click(within(quickActions).getByRole('button', { name: 'Open' }));
    await userEvent.click(within(quickActions).getByRole('button', { name: 'Download' }));
    await userEvent.click(within(quickActions).getByRole('button', { name: 'Share' }));
    await userEvent.click(within(quickActions).getByRole('button', { name: 'More options' }));

    expect(onItemClick).toHaveBeenCalledWith(item);
    expect(onDownload).toHaveBeenCalledWith(item);
    expect(onShare).toHaveBeenCalledWith(item);
    expect(onMore).toHaveBeenCalledWith(item);
  });
});
