import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contract } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';

import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import {
  CONTRACT_ADDRESSES,
  STAKING_ABI,
  SUPPORTED_CHAIN,
  TOKEN_SCALING,
  DEFAULT_SECONDS_PER_DAY,
  isStakingConfigured,
} from '../config/contracts';
import '../styles/StakingApp.css';

type StakingSummary = {
  staked: bigint;
  accrued: bigint;
  lastUpdate: bigint;
};

type StakingConstants = {
  oneToken: bigint;
  ratePerDay: bigint;
  secondsPerDay: bigint;
};

function formatToken(value: bigint, decimals = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionString = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractionString}`;
}

function formatTimestamp(value: bigint): string {
  if (value === 0n) {
    return 'Not updated yet';
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return 'Unavailable';
  }

  return new Date(asNumber * 1000).toLocaleString();
}

function normalizeError(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof (error as { message?: string }).message === 'string') {
    return (error as { message: string }).message;
  }

  return 'Transaction failed';
}

export function StakingApp() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAIN.id });
  const signer = useEthersSigner({ chainId: SUPPORTED_CHAIN.id });
  const { isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stakingConfigured = isStakingConfigured();
  const isOnSupportedChain = !chain || chain.id === SUPPORTED_CHAIN.id;

  const { data: constants, isLoading: constantsLoading } = useQuery<StakingConstants | null>({
    queryKey: ['staking-constants', stakingConfigured],
    queryFn: async () => {
      if (!publicClient || !stakingConfigured) {
        return null;
      }

      const [oneToken, ratePerDay, secondsPerDay] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'ONE_TOKEN',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'RATE_PER_DAY_USDT',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'SECONDS_PER_DAY',
        }) as Promise<bigint>,
      ]);

      return { oneToken, ratePerDay, secondsPerDay };
    },
    enabled: Boolean(publicClient && stakingConfigured),
    staleTime: 60_000,
  });

  const {
    data: summary,
    refetch,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useQuery<StakingSummary | null>({
    queryKey: ['staking-summary', address, stakingConfigured],
    queryFn: async () => {
      if (!publicClient || !address || !stakingConfigured) {
        return null;
      }

      const [staked, accrued, lastUpdate] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'getStaked',
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'getAccruedUSDT',
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.staking,
          abi: STAKING_ABI,
          functionName: 'getLastUpdate',
          args: [address],
        }) as Promise<bigint>,
      ]);

      return { staked, accrued, lastUpdate };
    },
    enabled: Boolean(address && publicClient && stakingConfigured && isOnSupportedChain),
    refetchInterval: 15_000,
  });

  const derivedConstants = useMemo(() => {
    if (!constants) {
      return {
        oneToken: TOKEN_SCALING,
        ratePerDay: 10_000_000n,
        secondsPerDay: DEFAULT_SECONDS_PER_DAY,
      };
    }

    return constants;
  }, [constants]);

  const dailyReward = useMemo(() => {
    return formatToken(derivedConstants.ratePerDay, 6);
  }, [derivedConstants.ratePerDay]);

  const rewardPerSecond = useMemo(() => {
    if (derivedConstants.ratePerDay === 0n || derivedConstants.secondsPerDay === 0n) {
      return '0';
    }

    const perSecond = derivedConstants.ratePerDay / derivedConstants.secondsPerDay;
    return formatToken(perSecond, 6);
  }, [derivedConstants.ratePerDay, derivedConstants.secondsPerDay]);

  const stakedDisplay = summary ? formatToken(summary.staked, 6) : '0';
  const accruedDisplay = summary ? formatToken(summary.accrued, 6) : '0';
  const lastUpdatedDisplay = summary ? formatTimestamp(summary.lastUpdate) : 'Not updated yet';

  const interactWithContract = useCallback(
    async (method: 'stakeOne' | 'withdrawOne' | 'claim') => {
      if (!stakingConfigured) {
        setTxStatus('Update CONTRACT_ADDRESSES in config with deployed addresses.');
        return;
      }

      if (!signer) {
        setTxStatus('Connect your wallet on Sepolia to continue.');
        return;
      }

      try {
        setIsProcessing(true);
        setTxStatus('Sending transaction...');

        const signerInstance = await signer;
        const stakingContract = new Contract(CONTRACT_ADDRESSES.staking, STAKING_ABI, signerInstance);
        const action = stakingContract[method] as () => Promise<unknown>;
        const tx = await action();

        setTxStatus('Waiting for confirmation...');

        // ethers v6 TransactionResponse has wait method on the result of action call.
        if (typeof (tx as { wait?: () => Promise<unknown> }).wait === 'function') {
          await (tx as { wait: () => Promise<unknown> }).wait();
        }

        setTxStatus('Transaction confirmed.');
        await refetch();
      } catch (error) {
        console.error('Staking action failed:', error);
        setTxStatus(normalizeError(error));
      } finally {
        setIsProcessing(false);
      }
    },
    [refetch, signer, stakingConfigured]
  );

  const isLoading = constantsLoading || summaryLoading || summaryFetching;

  if (!stakingConfigured) {
    return (
      <main className="staking-app">
        <div className="staking-container">
          <section className="staking-card warning">
            <h2>Deployment Required</h2>
            <p>
              Update <code>CONTRACT_ADDRESSES.staking</code> in <code>config/contracts.ts</code> with the deployed
              ConfidentialStaking contract address from <code>deployments/sepolia</code>.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!isOnSupportedChain) {
    return (
      <main className="staking-app">
        <div className="staking-container">
          <section className="staking-card warning">
            <h2>Unsupported Network</h2>
            <p>Please switch to the Sepolia network to manage your confidential staking position.</p>
          </section>
        </div>
      </main>
    );
  }

  if (!address) {
    return (
      <main className="staking-app">
        <div className="staking-container">
          <section className="staking-card info">
            <h2>Connect Wallet</h2>
            <p>Connect a wallet with RainbowKit to stake cETH and earn cUSDT rewards.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="staking-app">
      <div className="staking-container">
        <section className="staking-card overview">
          <header className="section-header">
            <div>
              <h2>Staking Overview</h2>
              <p>Your confidential staking position updates in real time.</p>
            </div>
            {isLoading && <span className="badge">Updating...</span>}
          </header>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-label">Staked cETH</span>
              <span className="metric-value">{stakedDisplay}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Accrued cUSDT</span>
              <span className="metric-value accent">{accruedDisplay}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Daily Yield</span>
              <span className="metric-value">{dailyReward} cUSDT</span>
            </div>
            <div className="metric">
              <span className="metric-label">Per Second</span>
              <span className="metric-value">{rewardPerSecond} cUSDT</span>
            </div>
            <div className="metric span-two">
              <span className="metric-label">Last Update</span>
              <span className="metric-value muted">{lastUpdatedDisplay}</span>
            </div>
          </div>
        </section>

        <section className="staking-card actions">
          <header className="section-header">
            <div>
              <h2>Manage Position</h2>
              <p>Stake or withdraw 1 cETH at a time and claim your rewards.</p>
            </div>
          </header>

          <div className="action-buttons">
            <button
              type="button"
              className="primary"
              onClick={() => interactWithContract('stakeOne')}
              disabled={isProcessing}
            >
              Stake 1 cETH
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => interactWithContract('withdrawOne')}
              disabled={isProcessing}
            >
              Withdraw 1 cETH
            </button>
            <button
              type="button"
              className="accent"
              onClick={() => interactWithContract('claim')}
              disabled={isProcessing}
            >
              Claim cUSDT
            </button>
          </div>

          {txStatus && <div className="status-message neutral">{txStatus}</div>}
          {zamaError && <div className="status-message error">{zamaError}</div>}
          {!zamaError && zamaLoading && <div className="status-message info">Initializing encryption service…</div>}
        </section>
      </div>
    </main>
  );
}
