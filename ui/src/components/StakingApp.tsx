import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contract } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';

import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import {
  APPROVAL_DURATION_SECONDS,
  CETH_ABI,
  CONTRACT_ADDRESSES,
  CUSDT_ABI,
  CUSDT_FAUCET_AMOUNT,
  DEFAULT_SECONDS_PER_DAY,
  STAKING_ABI,
  SUPPORTED_CHAIN,
  TOKEN_SCALING,
  isContractConfigured,
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

type StatusMessage = {
  text: string;
  variant: 'neutral' | 'error' | 'info';
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

function renderStatus(status: StatusMessage | null) {
  if (!status) {
    return null;
  }

  return <div className={`status-message ${status.variant}`}>{status.text}</div>;
}

export function StakingApp() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAIN.id });
  const signer = useEthersSigner({ chainId: SUPPORTED_CHAIN.id });
  const { isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [stakingStatus, setStakingStatus] = useState<StatusMessage | null>(null);
  const [cethFaucetStatus, setCethFaucetStatus] = useState<StatusMessage | null>(null);
  const [cusdtFaucetStatus, setCusdtFaucetStatus] = useState<StatusMessage | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<StatusMessage | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isMintingCETH, setIsMintingCETH] = useState(false);
  const [isMintingCUSDT, setIsMintingCUSDT] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const stakingConfigured = isStakingConfigured();
  const isOnSupportedChain = !chain || chain.id === SUPPORTED_CHAIN.id;
  const cusdtFaucetDisplay = useMemo(() => formatToken(CUSDT_FAUCET_AMOUNT, 6), []);

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

  const {
    data: operatorApproved,
    refetch: refetchOperator,
    isLoading: operatorLoading,
  } = useQuery<boolean>({
    queryKey: ['staking-operator', address, stakingConfigured],
    queryFn: async () => {
      if (!publicClient || !address || !stakingConfigured || !isContractConfigured('cETH')) {
        return false;
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.cETH,
        abi: CETH_ABI,
        functionName: 'isOperator',
        args: [address, CONTRACT_ADDRESSES.staking],
      });

      return Boolean(result);
    },
    enabled: Boolean(address && publicClient && stakingConfigured),
    staleTime: 30_000,
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

  const dailyReward = useMemo(() => formatToken(derivedConstants.ratePerDay, 6), [derivedConstants.ratePerDay]);

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
  const canStake = Boolean(operatorApproved);

  const interactWithContract = useCallback(
    async (method: 'stakeOne' | 'withdrawOne' | 'claim') => {
      if (!stakingConfigured) {
        setStakingStatus({ text: 'Update contract addresses in config/contracts.ts before interacting.', variant: 'error' });
        return;
      }

      if (!signer) {
        setStakingStatus({ text: 'Connect your wallet on Sepolia to continue.', variant: 'error' });
        return;
      }

      try {
        setIsProcessing(true);
        setStakingStatus({ text: 'Sending transaction…', variant: 'info' });

        const signerInstance = await signer;
        const stakingContract = new Contract(CONTRACT_ADDRESSES.staking, STAKING_ABI, signerInstance);
        const action = stakingContract[method] as () => Promise<unknown>;
        const tx = await action();

        setStakingStatus({ text: 'Waiting for confirmation…', variant: 'info' });

        if (typeof (tx as { wait?: () => Promise<unknown> }).wait === 'function') {
          await (tx as { wait: () => Promise<unknown> }).wait();
        }

        setStakingStatus({ text: 'Transaction confirmed.', variant: 'neutral' });
        await Promise.all([refetch(), refetchOperator()]);
      } catch (error) {
        console.error('Staking action failed:', error);
        setStakingStatus({ text: normalizeError(error), variant: 'error' });
      } finally {
        setIsProcessing(false);
      }
    },
    [refetch, refetchOperator, signer, stakingConfigured]
  );

  const mintCETH = useCallback(async () => {
    if (!stakingConfigured) {
      setCethFaucetStatus({ text: 'Deploy contracts and update config first.', variant: 'error' });
      return;
    }

    if (!signer || !address) {
      setCethFaucetStatus({ text: 'Connect your wallet to mint cETH.', variant: 'error' });
      return;
    }

    try {
      setIsMintingCETH(true);
      setCethFaucetStatus({ text: 'Minting 1 cETH…', variant: 'info' });

      const signerInstance = await signer;
      const cethContract = new Contract(CONTRACT_ADDRESSES.cETH, CETH_ABI, signerInstance);
      const tx = await cethContract.mint(address);

      if (typeof tx.wait === 'function') {
        await tx.wait();
      }

      setCethFaucetStatus({ text: 'Minted 1 cETH successfully.', variant: 'neutral' });
      await refetchOperator();
    } catch (error) {
      console.error('cETH faucet failed:', error);
      setCethFaucetStatus({ text: normalizeError(error), variant: 'error' });
    } finally {
      setIsMintingCETH(false);
    }
  }, [address, refetchOperator, signer, stakingConfigured]);

  const mintCUSDT = useCallback(async () => {
    if (!stakingConfigured) {
      setCusdtFaucetStatus({ text: 'Deploy contracts and update config first.', variant: 'error' });
      return;
    }

    if (!signer || !address) {
      setCusdtFaucetStatus({ text: 'Connect your wallet to mint cUSDT.', variant: 'error' });
      return;
    }

    try {
      setIsMintingCUSDT(true);
      setCusdtFaucetStatus({ text: `Minting ${cusdtFaucetDisplay} cUSDT…`, variant: 'info' });

      const signerInstance = await signer;
      const cusdtContract = new Contract(CONTRACT_ADDRESSES.cUSDT, CUSDT_ABI, signerInstance);
      const tx = await cusdtContract.mint(address, CUSDT_FAUCET_AMOUNT);

      if (typeof tx.wait === 'function') {
        await tx.wait();
      }

      setCusdtFaucetStatus({ text: `Minted ${cusdtFaucetDisplay} cUSDT.`, variant: 'neutral' });
    } catch (error) {
      console.error('cUSDT faucet failed:', error);
      setCusdtFaucetStatus({ text: normalizeError(error), variant: 'error' });
    } finally {
      setIsMintingCUSDT(false);
    }
  }, [address, cusdtFaucetDisplay, signer, stakingConfigured]);

  const approveStaking = useCallback(async () => {
    if (!stakingConfigured) {
      setApprovalStatus({ text: 'Deploy contracts and update config first.', variant: 'error' });
      return;
    }

    if (!signer) {
      setApprovalStatus({ text: 'Connect your wallet to authorize cETH usage.', variant: 'error' });
      return;
    }

    try {
      setIsApproving(true);
      setApprovalStatus({ text: 'Granting staking contract permission…', variant: 'info' });

      const signerInstance = await signer;
      const cethContract = new Contract(CONTRACT_ADDRESSES.cETH, CETH_ABI, signerInstance);
      const now = BigInt(Math.floor(Date.now() / 1000));
      const expiry = now + APPROVAL_DURATION_SECONDS;
      const tx = await cethContract.setOperator(CONTRACT_ADDRESSES.staking, expiry);

      if (typeof tx.wait === 'function') {
        await tx.wait();
      }

      setApprovalStatus({ text: 'Authorization granted.', variant: 'neutral' });
      await refetchOperator();
    } catch (error) {
      console.error('Authorization failed:', error);
      setApprovalStatus({ text: normalizeError(error), variant: 'error' });
    } finally {
      setIsApproving(false);
    }
  }, [refetchOperator, signer, stakingConfigured]);

  const isLoading = constantsLoading || summaryLoading || summaryFetching;

  if (!stakingConfigured) {
    return (
      <main className="staking-app">
        <div className="staking-container">
          <section className="staking-card warning">
            <h2>Deployment Required</h2>
            <p>
              Update <code>CONTRACT_ADDRESSES</code> in <code>config/contracts.ts</code> with the deployed
              ConfidentialStaking, ConfidentialETH, and ConfidentialUSDT addresses from <code>deployments/sepolia</code>.
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
            <p>Connect a wallet with RainbowKit to mint test tokens and stake cETH.</p>
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
            {isLoading && <span className="badge">Updating…</span>}
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

        <section className="staking-card tools">
          <header className="section-header">
            <div>
              <h2>Token Utilities</h2>
              <p>Mint confidential test tokens and authorize the staking contract.</p>
            </div>
          </header>
          <div className="tool-grid">
            <div className="tool-card">
              <h3>cETH Faucet</h3>
              <p>Mint 1 cETH (encrypted) to your connected address.</p>
              <button type="button" onClick={mintCETH} disabled={isMintingCETH}>
                {isMintingCETH ? 'Minting…' : 'Mint 1 cETH'}
              </button>
              {renderStatus(cethFaucetStatus)}
            </div>
            <div className="tool-card">
              <h3>cUSDT Faucet</h3>
              <p>Mint {cusdtFaucetDisplay} cUSDT to preview reward flows.</p>
              <button type="button" onClick={mintCUSDT} disabled={isMintingCUSDT}>
                {isMintingCUSDT ? 'Minting…' : `Mint ${cusdtFaucetDisplay} cUSDT`}
              </button>
              {renderStatus(cusdtFaucetStatus)}
            </div>
            <div className="tool-card">
              <h3>Authorize Staking</h3>
              <p>Grant the staking contract permission to operate your cETH balance.</p>
              <div className="indicator-row">
                <span className={`indicator ${operatorApproved ? 'success' : 'pending'}`}>
                  {operatorApproved ? 'Authorized' : 'Authorization required'}
                </span>
                {operatorLoading && <span className="badge subtle">Checking…</span>}
              </div>
              <button type="button" onClick={approveStaking} disabled={isApproving}>
                {isApproving ? 'Authorizing…' : 'Authorize cETH'}
              </button>
              {renderStatus(approvalStatus)}
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

          {!operatorApproved && (
            <div className="status-message info">
              Authorize the staking contract with your cETH before staking.
            </div>
          )}

          <div className="action-buttons">
            <button
              type="button"
              className="primary"
              onClick={() => interactWithContract('stakeOne')}
              disabled={isProcessing || !canStake}
            >
              {isProcessing ? 'Processing…' : 'Stake 1 cETH'}
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

          {renderStatus(stakingStatus)}
          {zamaError && <div className="status-message error">{zamaError}</div>}
          {!zamaError && zamaLoading && <div className="status-message info">Initializing encryption service…</div>}
        </section>
      </div>
    </main>
  );
}
