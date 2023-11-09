import "@nomiclabs/hardhat-ethers";
import { ethers, network } from "hardhat"; 
import dotenv from 'dotenv';

async function main() {
  dotenv.config(); 

  const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV2'
  const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
  const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
  const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV2'
  
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  const balance = (await deployer.getBalance()).toString()
  const acc = await deployer.getAddress();
  console.log(
    `Deploying the contracts with the account ${acc}, current acc balance: ${balance}`
  );


  const TestDAI = await ethers.getContractFactory("NofTestDAIV2");
  const testDAI = await TestDAI.deploy();
  await testDAI.deployed();

  const Nof = await ethers.getContractFactory("NofAlphaV2");
  const nof = await Nof.deploy("https://www.example.com", testDAI.address, acc);
  await nof.deployed();
  console.log("NoF address:", nof.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });