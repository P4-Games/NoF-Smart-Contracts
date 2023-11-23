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
  console.log('creating new Season T1...')
  let trx = await alpha.newSeason("T1", packPrice, 60, "T1");
  await trx.wait()

  console.log('getting season data...')
  const seasonData = await alpha.getSeasonData()
  console.log(seasonData)
  
  const forLimit = (addresses.length > 5 ? 5 : addresses.length);
  try {
    // se cargan las primeras 5 direcciones solamente o menos (si addresses tiene menos)
    for (let i = 0; (i < forLimit); i++) {
      console.log('approving for address', addresses[i].address)
      trx = await testDAI.connect(addresses[i]).approve(alpha.address, packPrice);

      console.log('minting for address', addresses[i].address)
      trx = await testDAI.connect(addresses[i])._mint(addresses[i].address, packPrice);

      console.log('buying pack, season T1 for address', addresses[i].address); 
      trx = await alpha.connect(addresses[i]).buyPack(packPrice, "T1");
    }
  
    console.log('pasting cards...')
    trx = await alpha.pasteCards(1, 0);
  
  } catch (ex) {
    console.error ({ ex })
  }
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
    /*
    let gasLimit = ethers.BigNumber.from((30000000).toString()) 
    try {
      console.log('buying Pack (estimating gas)...')
      const estimatedGas = await gammaPacks.estimateGas.buyPack({ from: addresses[0].address });
      console.log('buying Pack, estimated gas', estimatedGas)
      gasLimit = estimatedGas.add(20000) // security-margin
    } catch {
      // none
    }
    */

    console.log('buying Pack (real operation)...')
    // const tokenId = await gammaPacks.connect(addresses[0]).buyPack({ gasLimit });
    const tokenId = await gammaPacks.connect(addresses[0]).buyPack();
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
  
    /*
    console.log('buying 2 Packs (estimating gas)...')
    const estimatedGasTenPacks = await gammaPacks.estimateGas.buyPacks(2);
    console.log('buying 2 Packs, estimated gas', estimatedGasTenPacks)
    */

    console.log('buying 2 Packs (operation)...')
    // const gasLimitTenPacks = estimatedGasTenPacks.add(20000) // security-margin
    // const trxBuypacks = await gammaPacks.connect(addresses[0]).buyPacks(2, { gasLimit: gasLimitTenPacks });
    const trxBuypacks = await gammaPacks.connect(addresses[0]).buyPacks(2);
    await trxBuypacks.wait()
  
    console.log('Verifing user\'s packs...')
    const packs:[any] = await gammaPacks.getPacksByUser(addresses[0].address)
  
    console.log('User\'s packs')
    for (let i = 0; i < packs.length-1; i++) {
      console.log(`\tPack ${i+1} Id: ${packs[i]}`)
    }

    /*
    console.log('Added all cards by user', addresses[1].address)
    const transactionTestCards = await gammaCards.testAddCards({ from: addresses[0].address })
    await transactionTestCards.wait()
    */

  }

}


async function createOfferMockData( 
  addresses: SignerWithAddress[], 
  testDAI: Contract,
  gammaPacks: Contract, 
  gammaCards: Contract, 
  gammaOffers: Contract) {
      
  console.log('\nCreating Gamma Offers Mock Data...\n')

  type getCardsByUserType = any[][]
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0
  await gammaCards.changeRequireOpenPackSignerValidation(false)
  
  // user 0
  const address0  = addresses[0].address
  const packId1 = await gammaPacks.buyPack({ from: address0 })
  await gammaCards.testOpenPack(packId1.value, pack0Data)

  const packId2 = await gammaPacks.buyPack({ from: address0 })
  await gammaCards.testOpenPack(packId2.value, pack0Data)

  const packId3 = await gammaPacks.buyPack({ from: address0 })
  await gammaCards.testOpenPack(packId3.value, pack0Data)

  let cardsUser1: getCardsByUserType = await gammaCards.getCardsByUser(address0)

  await gammaOffers.createOffer(cardsUser1[0][0], [24,4,5,6,7,8]) // card #3
  await gammaOffers.createOffer(cardsUser1[0][3], [56, 78, 79, 80, 81, 82, 83, 84, 85, 86]) // card #3 (2da ofeta)
  await gammaOffers.createOffer(cardsUser1[0][1], [24,4,0,119,7,1]) // card #25
  await gammaOffers.createOffer(cardsUser1[0][2], [110,32, 2]) // card $28

  const offers = await gammaOffers.getOffers()
  console.log(cardsUser1, offers)

  // user 1
  /*
  const address1  = addresses[1].address 
  const allowance = await testDAI.allowance(address1, gammaPacks.address)
  console.log(`${addresses[0].address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance)

  tokenId = await gammaPacks._buyPack( address1 )
  await gammaCards.testOpenPack(tokenId.value, pack0Data)
  let cardsUser2: getCardsByUserType = await gammaCards.getCardsByUser(address1)
  await gammaOffers.createOffer(address1, cardsUser2[0][0], [24,4,5,6,7,8]) // card #3

  const offers = await gammaOffers.getOffers()
  console.log(cardsUser2, cardsUser2, offers)
  */
}


async function main() {
  try {
    const addresses: SignerWithAddress[] = await getInitData()
    
    const contracts: { 
      testDAI: Contract;
      alpha: Contract;
      gammaPacks: Contract;
      gammaCards: Contract;
      gammaOffers: Contract;
      signatureMethod: string;
    } = await deployContracts (addresses)
    
    // await createAlphaMockData(addresses, contracts.testDAI, contracts.alpha);

    await createGammaMockData(addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards, contracts.signatureMethod);

    await createOfferMockData (addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards, contracts.gammaOffers);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
