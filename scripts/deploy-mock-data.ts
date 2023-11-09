import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { getInitData, deployContracts } from "./common";

async function createAlphaMockData( addresses: SignerWithAddress[], testDAI: Contract, alpha: Contract ) {

  // Alpha Data
  // example season with 60 cards (50 cards & 10 albums) and 10 dai price per pack
  const packPrice = ethers.BigNumber.from("10000000000000000000")

  console.log('\nCreating Alpha Mock Data...\n')
  console.log('creating new Season...')
  await alpha.newSeason("T1", packPrice, 60, "T1");
  
  console.log('approving...')
  await testDAI.approve(alpha.address, packPrice);

  console.log('minting...')
  await testDAI._mint(addresses[0].address, packPrice);
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

async function createGammaMockData( 
  addresses: SignerWithAddress[], testDAI: Contract, 
  gammaPacks: Contract, gammaCards: Contract ) {
      
  console.log('\nCreating Gamma Mock Data...\n')
  console.log('buying Pack...')
  
  const estimatedGas = await gammaPacks.estimateGas.buyPack();
  const gasLimit = estimatedGas.add(10000) // security-margin
  console.log('estimated gas', estimatedGas)
  /*
  await gammaPacks.buyPack().send( { gasLimit });

  console.log('check user\'s packs')
  await gammaPacks.getPacksByUser(address0.address)
  */
}

async function main() {
  try {
    const addresses: SignerWithAddress[] = await getInitData()
    
    const contracts: { 
      testDAI: Contract;
      alpha: Contract;
      gammaPacks: Contract;
      gammaCards: Contract 
    } = await deployContracts (addresses)
    
    await createAlphaMockData(addresses, contracts.testDAI, contracts.alpha);

    await createGammaMockData(addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
