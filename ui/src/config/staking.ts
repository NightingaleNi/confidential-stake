// Addresses are expected via Vite env to avoid hardcoding and JSON files.
// Provide these in your build/runtime environment.
const stakingAddress = (import.meta as any).env?.VITE_STAKING_ADDRESS as `0x${string}` | undefined;

if (!stakingAddress) {
  // This message helps developers set correct env vars. No localStorage or JSON used.
  console.warn('VITE_STAKING_ADDRESS is not set. Set it to your Sepolia deployment address.');
}

export const STAKING_ADDRESS = (stakingAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ABI copied from compiled ConfidentialStaking contract (no JSON import)
export const STAKING_ABI = [
  { "inputs": [ { "internalType": "address", "name": "_cETH", "type": "address" }, { "internalType": "address", "name": "_cUSDT", "type": "address" } ], "stateMutability": "nonpayable", "type": "constructor" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint64", "name": "amountUSDT", "type": "uint64" } ], "name": "Claimed", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint64", "name": "units", "type": "uint64" } ], "name": "Staked", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "uint64", "name": "units", "type": "uint64" } ], "name": "Withdrawn", "type": "event" },
  { "inputs": [ { "internalType": "address", "name": "user", "type": "address" } ], "name": "getAccruedUSDT", "outputs": [ { "internalType": "uint64", "name": "", "type": "uint64" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "user", "type": "address" } ], "name": "getLastUpdate", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "user", "type": "address" } ], "name": "getStaked", "outputs": [ { "internalType": "uint64", "name": "", "type": "uint64" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "interestRatePerDay", "outputs": [ { "internalType": "uint64", "name": "", "type": "uint64" } ], "stateMutability": "pure", "type": "function" },
  { "inputs": [], "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "stakeOne", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "withdrawOne", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
] as const;

