import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialStaking", function () {
  const ONE = 1_000_000n; // 6 decimals
  const RATE_PER_DAY = 10_000_000n; // 10 USDT (6 decimals)
  const SECONDS_PER_DAY = 86_400n;

  it("stakeOne increases staked and initializes last update", async function () {
    const [deployer, user] = await ethers.getSigners();
    const CETH = await ethers.getContractFactory("ConfidentialETH");
    const ceth = await CETH.deploy();
    const CUSDT = await ethers.getContractFactory("ConfidentialUSDT");
    const cusdt = await CUSDT.deploy();
    const Staking = await ethers.getContractFactory("ConfidentialStaking");
    const staking = await Staking.deploy(await ceth.getAddress(), await cusdt.getAddress());

    // before stake
    expect(await staking.getStaked(user.address)).to.equal(0);
    expect(await staking.getAccruedUSDT(user.address)).to.equal(0);

    await staking.connect(user).stakeOne();

    expect(await staking.getStaked(user.address)).to.equal(ONE);
    // Immediately after stake, accrued remains zero (no elapsed)
    expect(await staking.getAccruedUSDT(user.address)).to.equal(0);
  });

  it("accrues USDT rewards over time and can claim", async function () {
    const [deployer, user] = await ethers.getSigners();
    const CETH = await ethers.getContractFactory("ConfidentialETH");
    const ceth = await CETH.deploy();
    const CUSDT = await ethers.getContractFactory("ConfidentialUSDT");
    const cusdt = await CUSDT.deploy();
    const Staking = await ethers.getContractFactory("ConfidentialStaking");
    const staking = await Staking.deploy(await ceth.getAddress(), await cusdt.getAddress());

    await staking.connect(user).stakeOne();

    // Advance time by 1 hour
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    const accrued = await staking.getAccruedUSDT(user.address);

    // Expected approx: 10 USDT/day * 3600 / 86400 = 0.416666... USDT (scaled 1e6)
    const expected = (RATE_PER_DAY * 3600n) / SECONDS_PER_DAY;
    // Allow small drift due to integer truncation
    expect(accrued).to.be.gte(expected - 10n);
    expect(accrued).to.be.lte(expected + 10n);

    // Claim resets accrued to zero
    await staking.connect(user).claim();
    expect(await staking.getAccruedUSDT(user.address)).to.equal(0);
  });

  it("withdrawOne reduces staked when available", async function () {
    const [deployer, user] = await ethers.getSigners();
    const CETH = await ethers.getContractFactory("ConfidentialETH");
    const ceth = await CETH.deploy();
    const CUSDT = await ethers.getContractFactory("ConfidentialUSDT");
    const cusdt = await CUSDT.deploy();
    const Staking = await ethers.getContractFactory("ConfidentialStaking");
    const staking = await Staking.deploy(await ceth.getAddress(), await cusdt.getAddress());

    await staking.connect(user).stakeOne();
    expect(await staking.getStaked(user.address)).to.equal(ONE);

    await staking.connect(user).withdrawOne();
    expect(await staking.getStaked(user.address)).to.equal(0);

    // Second withdraw should revert
    await expect(staking.connect(user).withdrawOne()).to.be.revertedWith("Insufficient staked");
  });
});

