import ArtifactCard from './ArtifactCard';
import { mockArtifacts } from '~/lib/mockArtifacts';

const noopArtifactAction = (_id: string) => undefined;

export function ArtifactCardDemo() {
  return (
    <div className="w-full space-y-3">
      {mockArtifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          id={artifact.id}
          name={artifact.name}
          type={artifact.type}
          size={artifact.size}
          createdAt={artifact.createdAt}
          status={artifact.status}
          onOpen={noopArtifactAction}
          onDownload={noopArtifactAction}
          onRename={noopArtifactAction}
          onDelete={noopArtifactAction}
        />
      ))}
    </div>
  );
}

export default ArtifactCardDemo;
