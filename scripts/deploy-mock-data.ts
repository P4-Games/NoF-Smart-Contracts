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


  const TestDAI = await ethers.getContractFactory(nofDaiContractName);
  const testDAI = await TestDAI.deploy();
  await testDAI.deployed();
  console.log("testDAI address:", testDAI.address);

  const Alpha = await ethers.getContractFactory(nofAlphaContractName);
  const alpha = await Alpha.deploy("https://www.example.com", testDAI.address, address0.address);
  await alpha.deployed();
  console.log("Alpha address:", alpha.address);

  const GammaPack = await ethers.getContractFactory(nofGammaPacksContractName);
  const gammaPack = await GammaPack.deploy(testDAI.address, address0.address);
  await gammaPack.deployed();
  console.log("Gamma Packs address:", gammaPack.address);

  const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName);
  const gammaCards = await GammaCards.deploy(testDAI.address, gammaPack.address, "https://www.example.com", address0.address);
  await gammaCards.deployed();
  console.log("Gamma Cards address:", gammaCards.address);
  await gammaPack.setCardsContract(gammaCards.address)

  // Alpha Data
  // example season with 60 cards (50 cards & 10 albums) and 10 dai price per pack
  const packPrice = ethers.BigNumber.from("10000000000000000000")

  console.log('Creating new Season...')
  await alpha.newSeason("T1", packPrice, 60, "T1");
  
  console.log('approving...')
  await testDAI.approve(alpha.address, packPrice);

  console.log('minting...')
  await testDAI._mint(address0.address, packPrice);
  for (let i = 1; i < 10; i++) {
    await testDAI.connect(addresses[i]).approve(alpha.address, packPrice);
    await testDAI.connect(addresses[i])._mint(addresses[i].address, packPrice);
  }

  console.log('buying pack...')
  await alpha.buyPack(packPrice, "T1");
  await alpha.connect(addresses[1]).buyPack(packPrice, "T1");

  console.log('pasting cards...')
  await alpha.pasteCards(1, 0);
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });