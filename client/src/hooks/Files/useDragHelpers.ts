import { useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useToastContext } from '@librechat/client';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useQueryClient } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import {
  QueryKeys,
  mergeFileConfig,
  resolveEndpointType,
  getEndpointFileConfig,
} from 'librechat-data-provider';
import type { DropTargetMonitor } from 'react-dnd';
import type * as t from 'librechat-data-provider';
import store from '~/store';
import useFileHandling from './useFileHandling';
import useLocalize from '../useLocalize';

export default function useDragHelpers() {
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const localize = useLocalize();
  const conversation = useRecoilValue(store.conversationByIndex(0)) || undefined;

  const { handleFiles } = useFileHandling();

  /** Use refs to avoid re-creating the drop handler */
  const handleFilesRef = useRef(handleFiles);
  const conversationRef = useRef(conversation);

  handleFilesRef.current = handleFiles;
  conversationRef.current = conversation;

  const handleDrop = useCallback(
    (item: { files: File[] }) => {
      /** Early block: leverage endpoint file config to prevent drag/drop on disabled endpoints */
      const currentEndpoint = conversationRef.current?.endpoint ?? 'default';
      const endpointsConfig = queryClient.getQueryData<t.TEndpointsConfig>([QueryKeys.endpoints]);

      /** Get agent data from cache; if absent, provider-specific file config restrictions are bypassed client-side */
      const agentId = conversationRef.current?.agent_id;
      const agent = agentId
        ? queryClient.getQueryData<t.Agent>([QueryKeys.agent, agentId])
        : undefined;

      const currentEndpointType = resolveEndpointType(
        endpointsConfig,
        currentEndpoint,
        agent?.provider,
      );
      const cfg = queryClient.getQueryData<t.FileConfig>([QueryKeys.fileConfig]);
      if (cfg) {
        const mergedCfg = mergeFileConfig(cfg as Parameters<typeof mergeFileConfig>[0]);
        const endpointCfg = getEndpointFileConfig({
          fileConfig: mergedCfg,
          endpoint: currentEndpoint,
          endpointType: currentEndpointType,
        });
        if (endpointCfg?.disabled === true) {
          showToast({
            message: localize('com_ui_attach_error_disabled'),
            status: 'error',
          });
          return;
        }
      }

      handleFilesRef.current(item.files);
    },
    [queryClient, showToast, localize],
  );

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop: handleDrop,
      canDrop: () => true,
      collect: (monitor: DropTargetMonitor) => {
        /** Optimize collect to reduce re-renders */
        const isOver = monitor.isOver();
        const canDrop = monitor.canDrop();
        return { isOver, canDrop };
      },
    }),
    [handleDrop],
  );

  return {
    canDrop,
    isOver,
    drop,
  };
}
