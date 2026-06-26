import { getConfigDefaults } from 'librechat-data-provider';
import type { TStartupConfig } from 'librechat-data-provider';

const defaultInterface = getConfigDefaults().interface;

export function shouldHideModelSelector(startupConfig?: TStartupConfig): boolean {
  const interfaceConfig = startupConfig?.interface ?? defaultInterface;
  const modelSpecsConfig = startupConfig?.modelSpecs;
  const modelSpecs = modelSpecsConfig?.list ?? [];

  if (modelSpecsConfig?.enforce === true && modelSpecs.length <= 1) {
    return true;
  }

  return interfaceConfig.modelSelect === false && modelSpecs.length === 0;
}
