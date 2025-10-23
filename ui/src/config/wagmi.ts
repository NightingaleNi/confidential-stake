import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Confidential Staking',
  projectId: 'cEthStakingProjectIdReplaceMe',
  chains: [sepolia],
  ssr: false,
});
