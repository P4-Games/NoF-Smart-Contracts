import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { generateSignature, getInitData, deployContracts, isHardhat, isLocalhost } from "./common";

async function createAlphaMockData( addresses: SignerWithAddress[], testDAI: Contract, alpha: Contract ) {
  // Alpha Data
  // example season with 60 cards (50 cards & 10 albums) and 10 dai price per pack
  const packPrice = ethers.BigNumber.from("10000000000000000000")

  console.log('\nCreating Alpha Mock Data...\n')
  console.log('creating new Season...')
  await alpha.newSeason("T1", packPrice, 60, "T1");

  console.log('getting season data...')
  const seasonData = await alpha.getSeasonData()
  console.log(seasonData)

  console.log('approving...')
  await testDAI.approve(alpha.address, packPrice);

  console.log('minting for address 0...')
  await testDAI._mint(addresses[0].address, packPrice);

  if (addresses.length > 1) {
    console.log('minting for the rest of addresses...')
    for (let i = 1; i < addresses.length; i++) {
      await testDAI.connect(addresses[i]).approve(alpha.address, packPrice);
      await testDAI.connect(addresses[i])._mint(addresses[i].address, packPrice);
    }
  }

  console.log('buying pack...')
  await alpha.buyPack(packPrice, "T1");
  await alpha.connect(addresses[1]).buyPack(packPrice, "T1");

  console.log('pasting cards...')
  await alpha.pasteCards(1, 0);

}

async function createGammaMockData( 
  addresses: SignerWithAddress[], testDAI: Contract, 
  gammaPacks: Contract, gammaCards: Contract, 
  signatureMethod: string) {
      
  console.log('\nCreating Gamma Mock Data...\n')

  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  console.log('approving in testDai...')
  await testDAI.approve(gammaPacks.address, TenPacksPrice);

  console.log('Verifing testDai balance...')
  const balance = await testDAI.balanceOf(addresses[0].address)
  console.log(`${addresses[0].address} balance: `, balance)

  console.log('Verifing testDai allowance...')
  const allowance = await testDAI.allowance(addresses[0].address, gammaPacks.address)
  console.log(`${addresses[0].address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance)

  if (isHardhat || isLocalhost) {
    console.log('buying Pack (estimating gas)...')
    const estimatedGas = await gammaPacks.estimateGas.buyPack({ from: addresses[0].address });

    console.log('buying Pack, estimated gas', estimatedGas)
    const gasLimit = estimatedGas.add(20000) // security-margin

    console.log('buying Pack (real operation)...')
    const tokenId = await gammaPacks.connect(addresses[0]).buyPack({ gasLimit });
    await tokenId.wait()
    console.log('Buyed Pack token Id', tokenId.value)
  
    console.log('Verifing testDai balance...')
    const balance2 = await testDAI.balanceOf(addresses[0].address)
    console.log(`${addresses[0].address} balance: `, balance2)
  
    console.log('Verifing testDai allowance...')
    const allowance2 = await testDAI.allowance(addresses[0].address, gammaPacks.address)
    console.log(`${addresses[0].address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance2)
  
    console.log('Verifing pack owner...')
    const packOwner = await gammaPacks.getPackOwner(tokenId.value)
    console.log(`Owner of TokenId ${tokenId.value}: ${packOwner}`)
  
    console.log('buying 2 Packs (estimating gas)...')
    const estimatedGasTenPacks = await gammaPacks.estimateGas.buyPacks(2);
    console.log('buying 2 Packs, estimated gas', estimatedGasTenPacks)
  
    console.log('buying 2 Packs (operation)...')
    const gasLimitTenPacks = estimatedGasTenPacks.add(20000) // security-margin
    const trxBuypacks = await gammaPacks.connect(addresses[0]).buyPacks(2, { gasLimit: gasLimitTenPacks });
    await trxBuypacks.wait()
  
    console.log('Verifing user\'s packs...')
    const packs:[any] = await gammaPacks.getPacksByUser(addresses[0].address)
  
    console.log('User\'s packs')
    for (let i = 0; i < packs.length-1; i++) {
      console.log(`\tPack ${i+1} Id: ${packs[i]}`)
    }

    console.log('Added all cards by 1 user', addresses[1].address)
    const transactionTestCards = await gammaCards.testAddCards({ from: addresses[0].address })
    await transactionTestCards.wait()

    /*
    //
    TO-FIX: reason: 'invalid arrayify value',
    //
    console.log('Opening Pack with cardData simulating backend signature...')
    const packNumber = ethers.BigNumber.from(packs[0]).toNumber()
    const signatureData: any = await generateSignature(signatureMethod, addresses[0].address, packNumber)
    const { packet_data, signature } = signatureData

    await gammaCards.openPack(packNumber, packet_data, signature)
    
    console.log('User\'s packs')
    for (let i = 0; i < packs.length-1; i++) {
      console.log(`\tPack ${i+1} Id: ${packs[i]}`)
    }
    */
  }

}

async function main() {
  try {
    const addresses: SignerWithAddress[] = await getInitData()
    
    const contracts: { 
      testDAI: Contract;
      alpha: Contract;
      gammaPacks: Contract;
      gammaCards: Contract;
      signatureMethod: string;
    } = await deployContracts (addresses)
    
    await createAlphaMockData(addresses, contracts.testDAI, contracts.alpha);

    await createGammaMockData(addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards, contracts.signatureMethod);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
