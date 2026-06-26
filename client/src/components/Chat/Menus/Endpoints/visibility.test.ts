import type { TStartupConfig } from 'librechat-data-provider';
import { shouldHideModelSelector } from './visibility';

const baseSpec = {
  name: 'bharatcode',
  label: 'BharatCode',
  preset: {
    endpoint: 'BharatCode',
    model: 'bharatcode:qwen36-35b-awq-200k',
  },
};

describe('shouldHideModelSelector', () => {
  it('hides the selector when one model spec is enforced', () => {
    const startupConfig = {
      interface: { modelSelect: true },
      modelSpecs: {
        enforce: true,
        list: [baseSpec],
      },
    } as unknown as TStartupConfig;

    expect(shouldHideModelSelector(startupConfig)).toBe(true);
  });

  it('keeps the selector visible when multiple enforced specs are available', () => {
    const startupConfig = {
      interface: { modelSelect: true },
      modelSpecs: {
        enforce: true,
        list: [
          baseSpec,
          {
            ...baseSpec,
            name: 'bharatcode-fast',
            label: 'BharatCode Fast',
          },
        ],
      },
    } as unknown as TStartupConfig;

    expect(shouldHideModelSelector(startupConfig)).toBe(false);
  });

  it('preserves existing hidden behavior when modelSelect is false and no specs exist', () => {
    const startupConfig = {
      interface: { modelSelect: false },
      modelSpecs: {
        enforce: false,
        list: [],
      },
    } as unknown as TStartupConfig;

    expect(shouldHideModelSelector(startupConfig)).toBe(true);
  });

  it('keeps the selector visible when modelSelect is enabled and specs are not enforced', () => {
    const startupConfig = {
      interface: { modelSelect: true },
      modelSpecs: {
        enforce: false,
        list: [baseSpec],
      },
    } as unknown as TStartupConfig;

    expect(shouldHideModelSelector(startupConfig)).toBe(false);
  });
});
