import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EModelEndpoint, mergeFileConfig } from 'librechat-data-provider';
import type { Agent, TEndpointsConfig } from 'librechat-data-provider';
import AttachFileChat from '../AttachFileChat';

const mockEndpointsConfig: TEndpointsConfig = {
  [EModelEndpoint.openAI]: { userProvide: false, order: 0 },
  [EModelEndpoint.agents]: { userProvide: false, order: 1 },
  [EModelEndpoint.assistants]: { userProvide: false, order: 2 },
  Moonshot: { type: EModelEndpoint.custom, userProvide: false, order: 9999 },
};

const defaultFileConfig = mergeFileConfig({
  endpoints: {
    Moonshot: { fileLimit: 5 },
    [EModelEndpoint.agents]: { fileLimit: 20 },
    default: { fileLimit: 10 },
  },
});

let mockFileConfig = defaultFileConfig;
let mockAgentsMap: Record<string, Partial<Agent>> = {};
let mockAgentQueryData: Partial<Agent> | undefined;
let mockAttachFileProps: Record<string, unknown> = {};

jest.mock('~/data-provider', () => ({
  useGetEndpointsQuery: () => ({ data: mockEndpointsConfig }),
  useGetFileConfig: ({ select }: { select?: (data: unknown) => unknown }) => ({
    data: select != null ? select(mockFileConfig) : mockFileConfig,
  }),
  useGetAgentByIdQuery: () => ({ data: mockAgentQueryData }),
}));

jest.mock('~/Providers', () => ({
  useAgentsMapContext: () => mockAgentsMap,
}));

jest.mock('../AttachFile', () => {
  return function MockAttachFile(props: Record<string, unknown>) {
    mockAttachFileProps = props;
    return <div data-testid="attach-file" />;
  };
});

function renderComponent(conversation: Record<string, unknown> | null, disableInputs = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <AttachFileChat
          conversation={conversation as never}
          disableInputs={disableInputs}
          files={new Map()}
          setFiles={() => {}}
          setFilesLoading={() => {}}
        />
      </RecoilRoot>
    </QueryClientProvider>,
  );
}

describe('AttachFileChat', () => {
  beforeEach(() => {
    mockFileConfig = defaultFileConfig;
    mockAgentsMap = {};
    mockAgentQueryData = undefined;
    mockAttachFileProps = {};
  });

  it('renders the plain attach control for agents endpoint uploads', () => {
    renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });

    expect(screen.getByTestId('attach-file')).toBeInTheDocument();
  });

  it('renders the plain attach control for custom endpoint uploads', () => {
    renderComponent({ endpoint: 'Moonshot' });

    expect(screen.getByTestId('attach-file')).toBeInTheDocument();
  });

  it('passes the active conversation to the plain attach control', () => {
    const conversation = { endpoint: 'Moonshot', conversationId: 'conversation-1' };

    renderComponent(conversation);

    expect(mockAttachFileProps.conversation).toEqual(conversation);
  });

  it('renders null for null conversation', () => {
    const { container } = renderComponent(null);

    expect(container.innerHTML).toBe('');
  });

  it('renders null when inputs are disabled', () => {
    const { container } = renderComponent(
      { endpoint: EModelEndpoint.agents, agent_id: 'agent-1' },
      true,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders null for agents endpoint when agents uploads are disabled', () => {
    mockFileConfig = mergeFileConfig({
      endpoints: {
        [EModelEndpoint.agents]: { disabled: true },
      },
    });

    const { container } = renderComponent({
      endpoint: EModelEndpoint.agents,
      agent_id: 'agent-1',
    });

    expect(container.innerHTML).toBe('');
  });

  it('uses an agent provider-specific file config when the agent is cached', () => {
    mockFileConfig = mergeFileConfig({
      endpoints: {
        Moonshot: { disabled: false, fileLimit: 5 },
        [EModelEndpoint.agents]: { disabled: true },
      },
    });
    mockAgentsMap = {
      'agent-1': { provider: 'Moonshot' } as Partial<Agent>,
    };

    renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-1' });

    expect(screen.getByTestId('attach-file')).toBeInTheDocument();
  });

  it('uses an agent provider-specific file config when the agent is fetched', () => {
    mockFileConfig = mergeFileConfig({
      endpoints: {
        Moonshot: { disabled: false, fileLimit: 5 },
        [EModelEndpoint.agents]: { disabled: true },
      },
    });
    mockAgentQueryData = { provider: 'Moonshot' } as Partial<Agent>;

    renderComponent({ endpoint: EModelEndpoint.agents, agent_id: 'agent-2' });

    expect(screen.getByTestId('attach-file')).toBeInTheDocument();
  });

  it('renders null for assistants endpoint when assistant uploads are disabled', () => {
    mockFileConfig = mergeFileConfig({
      endpoints: {
        [EModelEndpoint.assistants]: { disabled: true },
      },
    });

    const { container } = renderComponent({
      endpoint: EModelEndpoint.assistants,
    });

    expect(container.innerHTML).toBe('');
  });
});
