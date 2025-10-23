import { useAccount, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { STAKING_ABI, STAKING_ADDRESS } from '../config/staking';

function formatUnits6(value?: bigint) {
  if (value === undefined) return '-';
  const whole = value / 1_000_000n;
  const frac = (value % 1_000_000n).toString().padStart(6, '0').slice(0, 6);
  return `${whole}.${frac}`;
}

export function StakingApp() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const { data: staked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getStaked',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: accrued } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: 'getAccruedUSDT',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const write = async (method: 'stakeOne' | 'withdrawOne' | 'claim') => {
    const signer = await signerPromise;
    if (!signer) return;
    const contract = new Contract(STAKING_ADDRESS, STAKING_ABI as any, signer);
    const tx = await contract[method]();
    await tx.wait();
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Confidential Staking</h1>
        <ConnectButton />
      </header>

      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Your Position</h2>
        {!address ? (
          <p>Connect your wallet to view balances.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Staked cETH</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{formatUnits6(staked as bigint)}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Accrued cUSDT</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{formatUnits6(accrued as bigint)}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button onClick={() => write('stakeOne')} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Stake 1 cETH
          </button>
          <button onClick={() => write('withdrawOne')} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Withdraw 1 cETH
          </button>
          <button onClick={() => write('claim')} style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Claim cUSDT
          </button>
        </div>
      </section>

      <section style={{ marginTop: '1rem', color: '#6b7280', fontSize: 14 }}>
        <div>Rate: 1 cETH earns 10 cUSDT per day (per second).</div>
        <div>All values use 6 decimals.</div>
      </section>
    </div>
  );
}
