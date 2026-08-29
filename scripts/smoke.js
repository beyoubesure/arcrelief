const hre = require("hardhat");

async function main() {
  const address = process.env.ARCRELIEF_ADDRESS;
  if (!address) {
    throw new Error("Set ARCRELIEF_ADDRESS before running the smoke check.");
  }

  const contract = await hre.ethers.getContractAt("ArcRelief", address);
  const count = await contract.campaignCount();

  console.log("ArcRelief:", address);
  console.log("campaignCount:", count.toString());
  console.log(`Arcscan: https://testnet.arcscan.app/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
