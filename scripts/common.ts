import "@nomiclabs/hardhat-ethers";
import { ethers, network } from "hardhat"; 
import dotenv from 'dotenv';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function getInitData() {
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
  const [
    address0,
    address1,
    address2,
    address3,
    address4,
    address5,
    address6,
    address7,
    address8,
    address9
  ] = await ethers.getSigners();

  const addresses = [address0,
    address1,
    address2,
    address3,
    address4,
    address5,
    address6,
    address7,
    address8,
    address9
  ]

  console.log(
    `Deploying the contracts with the account ${acc}, current acc balance: ${balance}`
  );

  return addresses
}

export async function deployContracts(addresses: SignerWithAddress[]) {

  dotenv.config(); 

  const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV2'
  const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
  const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
  const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV2'
  
  const TestDAI = await ethers.getContractFactory(nofDaiContractName);
  const testDAI = await TestDAI.deploy();
  await testDAI.deployed();
  console.log("TestDAI deployed address:", testDAI.address);

  const Alpha = await ethers.getContractFactory(nofAlphaContractName);
  const alpha = await Alpha.deploy("https://www.example.com", testDAI.address, addresses[0].address);
  await alpha.deployed();
  console.log("Alpha deployed address:", alpha.address);

  const GammaPacks = await ethers.getContractFactory(nofGammaPacksContractName);
  const gammaPacks = await GammaPacks.deploy(testDAI.address, addresses[0].address);
  await gammaPacks.deployed();
  console.log("Gamma deployed Packs address:", gammaPacks.address);

  const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName);
  const gammaCards = await GammaCards.deploy(testDAI.address, gammaPacks.address, "https://www.example.com", addresses[0].address);
  await gammaCards.deployed();
  console.log("Gamma deployed Cards address:", gammaCards.address);
  await gammaPacks.setCardsContract(gammaCards.address);

  return { testDAI, alpha, gammaPacks, gammaCards };
  
}
