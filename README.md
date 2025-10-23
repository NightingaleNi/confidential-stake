# Confidential Staking Platform

A privacy-preserving decentralized staking platform built with Fully Homomorphic Encryption (FHE) technology, enabling users to stake confidential ETH (cETH) and earn confidential USDT (cUSDT) rewards while maintaining complete transaction privacy.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Problems Solved](#problems-solved)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Deployment](#deployment)
  - [Running the UI](#running-the-ui)
- [Usage](#usage)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

The Confidential Staking Platform is a groundbreaking DeFi application that leverages **Fully Homomorphic Encryption (FHE)** technology to enable completely private staking operations on the Ethereum blockchain. Users can stake confidential ETH tokens and earn rewards in confidential USDT, all while keeping their balances, transaction amounts, and staking positions completely hidden from public view.

This platform demonstrates the practical application of FHE in DeFi, showcasing how privacy and transparency can coexist in decentralized finance applications.

## Key Features

### Complete Transaction Privacy
- **Encrypted Balances**: All token balances (cETH and cUSDT) are encrypted on-chain using FHE
- **Private Staking Operations**: Stake and withdraw operations are performed on encrypted values
- **Hidden Rewards**: Accrued rewards remain encrypted until claimed
- **Zero-Knowledge Position Management**: Users can manage their positions without revealing amounts to other parties

### User-Friendly Interface
- **Modern React UI**: Built with React 19 and Vite for optimal performance
- **RainbowKit Integration**: Seamless wallet connection experience
- **Real-time Updates**: Live display of staking positions and accrued rewards
- **Responsive Design**: Works across desktop and mobile devices

### Efficient Reward System
- **Fixed APY**: 1 cETH staked generates 10 cUSDT per day (365% APY)
- **Per-Second Accrual**: Rewards accumulate continuously, calculated down to the second
- **Instant Claims**: Claim accumulated rewards at any time
- **Unit-based Staking**: Simple stake/withdraw operations in 1 cETH increments

### Developer-First Design
- **Comprehensive Testing**: Full test suite with Hardhat and Chai
- **TypeChain Integration**: Type-safe contract interactions
- **Deployment Scripts**: Automated deployment with hardhat-deploy
- **Well-documented Code**: Clear comments and documentation throughout

## Technology Stack

### Blockchain & Smart Contracts
- **Solidity 0.8.27**: Latest stable version with Cancun EVM support
- **FHEVM by Zama**: Fully Homomorphic Encryption Virtual Machine
- **Hardhat**: Development environment and testing framework
- **Ethers.js v6**: Blockchain interaction library
- **TypeChain**: TypeScript bindings for smart contracts
- **OpenZeppelin Contracts**: Battle-tested security standards

### Frontend
- **React 19**: Latest React with concurrent features
- **TypeScript 5.8**: Type-safe frontend development
- **Vite 7**: Next-generation frontend tooling
- **Wagmi v2**: React hooks for Ethereum
- **RainbowKit v2**: Wallet connection UI
- **TanStack Query**: Async state management
- **Viem**: TypeScript-first Ethereum library

### Encryption & Privacy
- **@fhevm/solidity**: FHE smart contract library
- **@zama-fhe/relayer-sdk**: Encryption key management
- **Encrypted-types**: Type definitions for encrypted values
- **new-confidential-contracts**: Confidential token standards

### Development Tools
- **Hardhat Deploy**: Deployment management
- **Hardhat Gas Reporter**: Gas optimization analysis
- **Solidity Coverage**: Code coverage analysis
- **ESLint & Prettier**: Code quality and formatting
- **Solhint**: Solidity linting
- **Mocha & Chai**: Testing frameworks

## Problems Solved

### 1. Privacy in DeFi
**Problem**: Traditional DeFi platforms expose all transaction details publicly, revealing users' financial positions, trading strategies, and holdings to anyone who cares to look.

**Solution**: By implementing FHE, all sensitive financial data remains encrypted on-chain. Even validators and miners cannot see staking amounts, balances, or rewards, ensuring complete financial privacy while maintaining the benefits of decentralization.

### 2. Regulatory Compliance
**Problem**: Public transparency in blockchain conflicts with privacy regulations like GDPR and financial privacy requirements.

**Solution**: Confidential transactions enable compliance with privacy regulations while maintaining the auditability and transparency benefits of blockchain through selective disclosure mechanisms.

### 3. Front-Running & MEV
**Problem**: Public transaction mempool allows bad actors to front-run trades, extract MEV, and exploit user transactions.

**Solution**: Encrypted transaction amounts prevent MEV bots and front-runners from understanding transaction intent, protecting users from predatory trading practices.

### 4. Competitive Intelligence
**Problem**: Large institutional players can track competitors' positions and strategies through on-chain analysis.

**Solution**: Encrypted balances and positions prevent competitive intelligence gathering, allowing all users to operate without revealing strategic information.

### 5. User Experience in Privacy Protocols
**Problem**: Most privacy solutions (like ZK-rollups) require complex user workflows, high gas costs, or significant technical knowledge.

**Solution**: Our platform provides a simple, intuitive interface that handles all encryption complexity behind the scenes, making privacy accessible to non-technical users.

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ RainbowKit │──│ Wagmi/Viem   │──│ Zama Relayer SDK │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ethereum Sepolia Testnet                    │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │ ConfidentialETH │  │ ConfidentialUSDT                 │ │
│  │  (ERC20-FHE)    │  │  (ERC20-FHE)                     │ │
│  └─────────────────┘  └──────────────────────────────────┘ │
│           │                        │                         │
│           └────────┬───────────────┘                         │
│                    ▼                                         │
│         ┌─────────────────────────┐                         │
│         │  ConfidentialStaking    │                         │
│         │  - stakeOne()           │                         │
│         │  - withdrawOne()        │                         │
│         │  - claim()              │                         │
│         │  - Reward Calculation   │                         │
│         └─────────────────────────┘                         │
│                    │                                         │
│                    ▼                                         │
│         ┌─────────────────────────┐                         │
│         │   FHEVM (Zama)          │                         │
│         │   Encrypted Operations  │                         │
│         └─────────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Contract Architecture

1. **ConfidentialETH.sol**: FHE-enabled ERC20 token representing staked ETH
2. **ConfidentialUSDT.sol**: FHE-enabled ERC20 token for reward distribution
3. **ConfidentialStaking.sol**: Core staking logic with encrypted operations

### Data Flow

1. **Staking**:
   ```
   User → Frontend → RainbowKit → Wagmi → ConfidentialStaking.stakeOne()
   → Update encrypted balance → Emit event
   ```

2. **Reward Accrual**:
   ```
   Time passes → User queries → Contract calculates rewards
   → Returns encrypted amount → Frontend decrypts for user
   ```

3. **Claiming**:
   ```
   User → claim() → Calculate final rewards → Mint cUSDT
   → Transfer to user → Reset accrued rewards
   ```

## Smart Contracts

### ConfidentialStaking.sol

The main staking contract that manages user positions and reward distribution.

**Key Functions**:
- `stakeOne()`: Stake 1 cETH unit (1,000,000 with 6 decimals)
- `withdrawOne()`: Withdraw 1 cETH unit
- `claim()`: Claim all accrued cUSDT rewards
- `getStaked(address)`: View staked amount
- `getAccruedUSDT(address)`: View current accrued rewards
- `getLastUpdate(address)`: View last update timestamp

**Reward Calculation**:
```solidity
rewards = (staked_amount * RATE_PER_DAY * elapsed_time) / (SECONDS_PER_DAY * ONE_TOKEN)
```

**Constants**:
- `ONE_TOKEN`: 1,000,000 (6 decimals)
- `RATE_PER_DAY_USDT`: 10,000,000 (10 cUSDT per day)
- `SECONDS_PER_DAY`: 86,400

### ConfidentialETH.sol

FHE-enabled token representing confidential ETH.

**Features**:
- Inherits from `ConfidentialFungibleToken`
- Encrypted balances using FHEVM
- Mint function for testing/distribution
- Full ERC20 compatibility with encryption

### ConfidentialUSDT.sol

FHE-enabled stablecoin for reward distribution.

**Features**:
- Encrypted reward tokens
- Minted by staking contract as rewards
- Full privacy preservation
- Standard ERC20 interface

## Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH**: For testnet deployment and transactions

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/confidential-stake.git
   cd confidential-stake
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install UI dependencies**
   ```bash
   cd ui
   npm install
   cd ..
   ```

### Configuration

1. **Set up environment variables for contracts**

   ```bash
   # Set your mnemonic for deployment
   npx hardhat vars set MNEMONIC

   # Or use a private key (optional)
   echo "PRIVATE_KEY=your_private_key" > .env

   # Set Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

2. **Configure UI contract addresses**

   After deployment, update `ui/src/config/contracts.ts` with deployed contract addresses from `deployments/sepolia/`.

### Deployment

#### Deploy to Sepolia Testnet

1. **Compile contracts**
   ```bash
   npm run compile
   ```

2. **Deploy to Sepolia**
   ```bash
   npm run deploy:sepolia
   ```

3. **Note the deployed addresses**
   The deployment script will output three addresses:
   - ConfidentialETH
   - ConfidentialUSDT
   - ConfidentialStaking

4. **Verify contracts (optional)**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

#### Deploy to Local Network

1. **Start local FHEVM node**
   ```bash
   npm run chain
   ```

2. **In a new terminal, deploy**
   ```bash
   npm run deploy:localhost
   ```

### Running the UI

1. **Navigate to UI directory**
   ```bash
   cd ui
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open browser**
   Navigate to `http://localhost:5173`

4. **Connect wallet**
   - Click "Connect Wallet" in the header
   - Select your preferred wallet
   - Switch to Sepolia network if needed

5. **Start staking**
   - Mint some cETH tokens (for testing)
   - Click "Stake 1 cETH" to stake
   - Watch your rewards accrue in real-time
   - Click "Claim cUSDT" to collect rewards

## Usage

### For Users

1. **Connect Your Wallet**
   - Ensure you're on Sepolia testnet
   - Connect via RainbowKit interface

2. **Acquire cETH**
   - For testnet: Use the mint function (if available)
   - For mainnet: Bridge ETH to cETH through authorized providers

3. **Stake Your Tokens**
   - Click "Stake 1 cETH" to stake one unit
   - Transaction will be processed with encrypted amounts
   - View your staked position in real-time

4. **Monitor Rewards**
   - Rewards accrue continuously (10 cUSDT per day per 1 cETH)
   - View accrued rewards in the dashboard
   - Rewards update every 15 seconds

5. **Claim Rewards**
   - Click "Claim cUSDT" when you have accrued rewards
   - Rewards are minted and transferred to your wallet
   - All amounts remain encrypted on-chain

6. **Withdraw Stake**
   - Click "Withdraw 1 cETH" to unstake one unit
   - Rewards are automatically calculated before withdrawal
   - Withdrawn tokens return to your wallet

### For Developers

#### Interacting with Contracts

```typescript
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, STAKING_ABI } from "./config/contracts";

// Connect to contract
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const staking = new ethers.Contract(
  CONTRACT_ADDRESSES.staking,
  STAKING_ABI,
  signer
);

// Stake tokens
await staking.stakeOne();

// Check staked amount
const staked = await staking.getStaked(userAddress);

// Check accrued rewards
const rewards = await staking.getAccruedUSDT(userAddress);

// Claim rewards
await staking.claim();

// Withdraw stake
await staking.withdrawOne();
```

#### Reading Encrypted Values

```typescript
import { useZamaInstance } from "./hooks/useZamaInstance";

// Initialize Zama instance for decryption
const { instance, isLoading } = useZamaInstance();

// Decrypt values (handled automatically by hooks)
// Frontend shows decrypted values only to authorized users
```

## Testing

### Run All Tests

```bash
npm run test
```

### Test on Sepolia

```bash
npm run test:sepolia
```

### Coverage Report

```bash
npm run coverage
```

### Test Cases

The project includes comprehensive tests for:
- Staking operations (stake/unstake)
- Reward accrual over time
- Claim functionality
- Edge cases and error conditions
- Overflow protection
- Time-based calculations

Example test output:
```
ConfidentialStaking
  ✓ stakeOne increases staked and initializes last update (89ms)
  ✓ accrues USDT rewards over time and can claim (145ms)
  ✓ withdrawOne reduces staked when available (98ms)

3 passing (2s)
```

## Security Considerations

### Smart Contract Security

1. **Access Control**
   - Staking contract functions are properly restricted
   - Only authorized addresses can mint tokens
   - User can only modify their own positions

2. **Overflow Protection**
   - All arithmetic uses Solidity 0.8+ built-in overflow checks
   - Additional checks for reward accumulation
   - `AccrualOverflow` error for safety

3. **Reentrancy Protection**
   - State updates before external calls
   - No complex external interactions
   - Simple, linear control flow

4. **Input Validation**
   - Withdrawal checks sufficient balance
   - Claim checks for available rewards
   - All inputs properly validated

### Privacy Guarantees

1. **On-Chain Privacy**
   - All balances stored as encrypted euint64 values
   - Transaction amounts never revealed publicly
   - Only authorized users can decrypt their own data

2. **Validator Privacy**
   - Validators cannot see encrypted values
   - Computations performed on encrypted data
   - No plaintext exposure during processing

3. **Front-End Security**
   - Decryption keys never leave user's device
   - Zama Relayer SDK handles key management
   - Secure communication with encryption service

### Auditing

- **Status**: Not yet audited
- **Recommendations**:
  - Formal security audit before mainnet deployment
  - Bug bounty program for community testing
  - Gradual rollout with TVL caps

### Known Limitations

1. **Testnet Only**: Currently deployed on Sepolia testnet
2. **Gas Costs**: FHE operations are more expensive than regular operations
3. **FHE Limitations**: Encrypted operations have computational constraints
4. **Early Stage**: FHEVM technology is still maturing

## Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)

- [ ] **Multi-Token Support**
  - Support staking various encrypted tokens
  - Multiple reward token options
  - Dynamic APY based on token type

- [ ] **Flexible Staking Amounts**
  - Allow arbitrary staking amounts (not just 1-unit increments)
  - Dynamic reward calculations
  - Improved user flexibility

- [ ] **Enhanced UI/UX**
  - Portfolio dashboard with historical data
  - Reward projection calculator
  - Transaction history visualization
  - Mobile app development

### Phase 2: Advanced Features (Q3 2025)

- [ ] **Staking Pools**
  - Create and join encrypted staking pools
  - Shared rewards distribution
  - Pool governance mechanisms

- [ ] **Liquidity Provision**
  - Stake LP tokens confidentially
  - Automated market maker integration
  - Impermanent loss protection

- [ ] **NFT Staking**
  - Stake encrypted NFTs
  - Rarity-based reward multipliers
  - NFT collection management

- [ ] **Governance System**
  - Encrypted voting mechanisms
  - Proposal submission
  - Time-locked voting periods

### Phase 3: DeFi Integration (Q4 2025)

- [ ] **Lending & Borrowing**
  - Use staked positions as collateral
  - Encrypted credit scores
  - Private lending pools

- [ ] **Cross-Chain Support**
  - Bridge to other FHEVM-compatible chains
  - Multi-chain position management
  - Unified dashboard

- [ ] **Derivatives**
  - Encrypted options and futures
  - Synthetic asset creation
  - Risk management tools

### Phase 4: Mainnet & Scale (Q1 2026)

- [ ] **Mainnet Deployment**
  - Full security audit completion
  - Bug bounty program
  - Gradual TVL increase

- [ ] **Institutional Features**
  - Multi-signature support
  - Advanced reporting
  - Compliance tools
  - API for institutions

- [ ] **Performance Optimization**
  - Gas optimization
  - Batch operations
  - Layer 2 integration

### Phase 5: Ecosystem Growth (Q2-Q4 2026)

- [ ] **Developer Tools**
  - SDK for building on top of platform
  - Developer documentation
  - Integration templates
  - Grant program

- [ ] **Privacy Analytics**
  - Zero-knowledge analytics dashboard
  - Encrypted metrics aggregation
  - Public statistics without compromising privacy

- [ ] **Mobile Applications**
  - Native iOS app
  - Native Android app
  - Push notifications for rewards

- [ ] **Social Features**
  - Encrypted messaging
  - Private groups
  - Referral program

### Long-Term Vision

Our ultimate goal is to create a comprehensive confidential DeFi ecosystem where:
- All financial operations maintain complete privacy
- Users have full control over data disclosure
- Institutions can operate compliantly
- Privacy is accessible to everyone, not just technical users
- The platform becomes the foundation for next-generation private finance

## Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm run test
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Write comprehensive tests for new features
- Update documentation for API changes
- Keep commits atomic and well-described
- Be respectful and constructive in discussions

### Areas for Contribution

- Bug fixes and improvements
- New features from roadmap
- Documentation enhancements
- Test coverage expansion
- UI/UX improvements
- Performance optimizations
- Security audits and reviews

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints
- Maintain professional conduct

## License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

Key points:
- Free to use, modify, and distribute
- Requires attribution
- No patent rights granted
- No warranty provided

## Support

### Documentation & Resources

- **FHEVM Documentation**: [docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **FHEVM Hardhat Guide**: [docs.zama.ai/protocol/solidity-guides](https://docs.zama.ai/protocol/solidity-guides)
- **Zama Community**: [discord.gg/zama](https://discord.gg/zama)

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/confidential-stake/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/yourusername/confidential-stake/discussions)
- **Discord**: Join our community server (link coming soon)
- **Twitter**: Follow us @confidentialstake (coming soon)

### Reporting Issues

When reporting issues, please include:
- Detailed description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Error messages and logs
- Screenshots if applicable

### Security Issues

**Do not open public issues for security vulnerabilities!**

Instead:
- Email security concerns to: security@confidentialstake.io
- Provide detailed description of the vulnerability
- Allow time for us to address before public disclosure
- We'll credit researchers in security advisories

---

## Acknowledgments

Built with cutting-edge privacy technology from:
- **Zama**: For pioneering FHEVM technology
- **Ethereum Foundation**: For the underlying blockchain infrastructure
- **OpenZeppelin**: For secure smart contract libraries
- **RainbowKit**: For excellent wallet connection UX

Special thanks to the Zama team for their continued support and innovation in bringing FHE to blockchain technology.

---

**Built with ❤️ and 🔐 by the Confidential Stake team**

*Privacy is not a feature, it's a fundamental right.*
