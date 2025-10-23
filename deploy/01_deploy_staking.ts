import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // Deploy ConfidentialETH
  const cETH = await deploy("ConfidentialETH", {
    from: deployer,
    log: true,
  });

  // Deploy ConfidentialUSDT
  const cUSDT = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  // Deploy ConfidentialStaking with token addresses
  const staking = await deploy("ConfidentialStaking", {
    from: deployer,
    args: [cETH.address, cUSDT.address],
    log: true,
  });

  console.log(`ConfidentialETH: ${cETH.address}`);
  console.log(`ConfidentialUSDT: ${cUSDT.address}`);
  console.log(`ConfidentialStaking: ${staking.address}`);
};

export default func;
func.id = "deploy_staking";
func.tags = ["Staking", "Tokens"];

