const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying ArcRelief with:", deployer.address);
  console.log("Network:", hre.network.name);

  const ArcRelief = await hre.ethers.getContractFactory("ArcRelief");
  const arcRelief = await ArcRelief.deploy();
  await arcRelief.waitForDeployment();

  const address = await arcRelief.getAddress();

  console.log("\nArcRelief deployed to:");
  console.log(address);
  console.log(`\nArcscan: https://testnet.arcscan.app/address/${address}`);
  console.log("\nNext: copy this address into frontend/config.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
