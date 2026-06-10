import { fireEvent, render, screen } from '@testing-library/react';
import ArtifactCard from '../ArtifactCard';
import ArtifactCardDemo from '../ArtifactCardDemo';

const readyArtifact = {
  id: 'artifact-ready',
  name: 'final-report-sem2-very-long-file-name.pdf',
  type: 'PDF',
  size: '2.4 MB',
  createdAt: '5 minutes ago',
};

describe('ArtifactCard', () => {
  it('renders artifact details and ready-state actions', () => {
    const onOpen = jest.fn();
    const onDownload = jest.fn();
    const onRename = jest.fn();
    const onDelete = jest.fn();

    render(
      <ArtifactCard
        {...readyArtifact}
        onOpen={onOpen}
        onDownload={onDownload}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText(readyArtifact.name)).toBeInTheDocument();
    expect(screen.getByText('PDF - 2.4 MB - 5 minutes ago')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    fireEvent.click(screen.getByRole('button', { name: `Rename ${readyArtifact.name}` }));
    fireEvent.click(screen.getByRole('button', { name: `Delete ${readyArtifact.name}` }));

    expect(onOpen).toHaveBeenCalledWith(readyArtifact.id);
    expect(onDownload).toHaveBeenCalledWith(readyArtifact.id);
    expect(onRename).toHaveBeenCalledWith(readyArtifact.id);
    expect(onDelete).toHaveBeenCalledWith(readyArtifact.id);
  });

  it('keeps long filenames wrap-safe instead of rendering URLs', () => {
    const longName =
      'very-long-file-name-that-should-not-break-mobile-layout-or-overflow-the-card-final-version.docx';

    const { container } = render(
      <ArtifactCard
        {...readyArtifact}
        id="artifact-long"
        name={longName}
        type="Document"
        size="846 KB"
        createdAt="Today"
      />,
    );

    expect(screen.getByText(longName)).toHaveClass('[overflow-wrap:anywhere]');
    expect(container).not.toHaveTextContent(/https?:\/\//i);
    expect(container).not.toHaveTextContent(/gcs|supabase/i);
  });

  it('renders loading, error, and deleted states', () => {
    const { rerender } = render(<ArtifactCard {...readyArtifact} status="loading" />);

    expect(screen.getByRole('status', { name: 'Loading artifact' })).toBeInTheDocument();

    rerender(<ArtifactCard {...readyArtifact} status="error" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Artifact failed to load');
    expect(screen.getByText(readyArtifact.name)).toBeInTheDocument();

    rerender(<ArtifactCard {...readyArtifact} status="deleted" />);
    expect(screen.getByText('Artifact deleted')).toBeInTheDocument();
    expect(screen.getByText('This file is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });
});

describe('ArtifactCardDemo', () => {
  it('renders mocked artifacts across all required states', () => {
    render(<ArtifactCardDemo />);

    expect(screen.getByText(/final-report-semester-2/i)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading artifact' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Artifact failed to load');
    expect(screen.getByText('Artifact deleted')).toBeInTheDocument();
  });
});
