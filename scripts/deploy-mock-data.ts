import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { /*generateSignature,*/ gammaDaiBySigner, getInitData, deployContracts, isHardhat, isLocalhost } from "./common";

async function createAlphaMockData( addresses: SignerWithAddress[], testDAI: Contract, alpha: Contract ) {
  // Alpha Data
  // example season with 60 cards (50 cards & 10 albums) and 10 dai price per pack
  const packPrice = ethers.BigNumber.from("10000000000000000000")

  console.log('----------------------------------')
  console.log('Creating Alpha Mock Data')
  console.log('----------------------------------\n')
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

async function gammaCircuitPack(signer: SignerWithAddress, testDAI: Contract, gammaPacks: Contract) {

  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  console.log('buying Pack...')
  const tokenId = await gammaPacks.buyPackByUser(signer.address);
  await tokenId.wait()
  console.log('Buyed Pack token Id', tokenId.value)

  console.log('Verifing testDai balance...')
  const balance2 = await testDAI.balanceOf(signer.address)
  console.log(`${signer.address} balance: `, balance2)

  console.log('Verifing testDai allowance...')
  const allowance2 = await testDAI.allowance(signer.address, gammaPacks.address)
  console.log(`${signer.address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance2)

  console.log('Verifing pack owner...')
  const packOwner = await gammaPacks.connect(signer).getPackOwner(tokenId.value)
  console.log(`Owner of TokenId ${tokenId.value}: ${packOwner}`)

  console.log('buying 2 Packs...')
  const trxBuypacks = await gammaPacks.buyPacksByUser(signer.address, 2);
  await trxBuypacks.wait()
  console.log('Buyed 2 Pack tokens Ids', trxBuypacks.value)

  console.log('Verifing user\'s packs...')
  const packs:[any] = await gammaPacks.getPacksByUser(signer.address)
  for (let i = 0; i < packs.length-1; i++) {
    console.log(`\tPack ${i+1} Id: ${packs[i]}`)
  }
}

async function gammaCircuitPackWithoutOwner(
  signer: SignerWithAddress, testDAI: Contract, 
  gammaPacks: Contract, gammaCards: Contract, packData: number[]) {

  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  console.log('buying Pack...')
  const tokenId = await gammaPacks.connect(signer).buyPack();
  await tokenId.wait()
  console.log('Buyed Pack token Id', tokenId.value)

  console.log('Verifing testDai balance...')
  const balance2 = await testDAI.balanceOf(signer.address)
  console.log(`${signer.address} balance: `, balance2)

  console.log('Verifing testDai allowance...')
  const allowance2 = await testDAI.allowance(signer.address, gammaPacks.address)
  console.log(`${signer.address} allowance to use with $ gamaPackAddress (${gammaPacks.address}): `, allowance2)

  console.log('Verifing pack owner...')
  const packOwner = await gammaPacks.connect(signer).getPackOwner(tokenId.value)
  console.log(`Owner of TokenId ${tokenId.value}: ${packOwner}`)

  console.log('Verifing user\'s packs...')
  const packs:[any] = await gammaPacks.getPacksByUser(signer.address)
  for (let i = 0; i < packs.length-1; i++) {
    console.log(`\tPack ${i+1} Id: ${packs[i]}`)
  }

  console.log('Open pack...')
  const trxBuypacks = await gammaCards.connect(signer).openPack(packs[0], packData, []);
  await trxBuypacks.wait()
  
}

async function gammaCircuitAllCards(signer: SignerWithAddress, gammaCards: Contract) {
    console.log('Adding all cards to user', signer.address)
    const transactionTestCards = await gammaCards.testAddCards(signer.address)
    await transactionTestCards.wait()
}

async function createGammaMockData( 
  addresses: SignerWithAddress[], testDAI: Contract, 
  gammaPacks: Contract, gammaCards: Contract) {
      
  console.log('\n----------------------------------')
  console.log('Creating Gamma Mock Data')
  console.log('----------------------------------\n')

  await gammaDaiBySigner(addresses[0], testDAI, gammaPacks)
  await gammaDaiBySigner(addresses[1], testDAI, gammaPacks)
  await gammaDaiBySigner(addresses[2], testDAI, gammaPacks)
  await gammaDaiBySigner(addresses[3], testDAI, gammaPacks)
  await gammaCircuitPack(addresses[0], testDAI, gammaPacks)
  await gammaCircuitPack(addresses[1], testDAI, gammaPacks)
  await gammaCircuitPack(addresses[2], testDAI, gammaPacks)
  await gammaCircuitPack(addresses[3], testDAI, gammaPacks)

  await gammaCircuitPackWithoutOwner(addresses[0], testDAI, gammaPacks, gammaCards, [25,62,94,71,41,77,100,90,3,58,113,28])
  await gammaCircuitPackWithoutOwner(addresses[1], testDAI, gammaPacks, gammaCards, [25,62,94,71,41,77,100,90,3,58,113,28])
  
  await gammaCircuitAllCards(addresses[4], gammaCards)
  await gammaCircuitAllCards(addresses[5], gammaCards)
  await gammaCircuitAllCards(addresses[6], gammaCards)

}

async function gammaOfferBuyPack(signer: SignerWithAddress, gammaPacks: Contract, gammaCards: Contract, packData: number[]) {
  const packId1 = await gammaPacks.buyPackByUser(signer.address)
  await gammaCards.testOpenPack(signer.address, packId1.value, packData)
}

function printCardsByUser(wallet: string, cards: any[]) {
  if (!cards || cards.length === 0) {
    console.log('no cards for wallet', wallet)
    return
  } 
  cards[0].forEach((card: number, index: number) => {
    console.log(`wallet: ${wallet}, card: ${card}, quantity: ${cards[1][index]}, offered: ${cards[2][index]}`)
  })
}

function printOffers(offers: any[]) {
  offers.forEach((offer: any[]) => {
    console.log(`offer: ${offer[0]}, offerCard: ${offer[1]}, offerWallet: ${offer[3]}, wantedCards: ${offer[2].join (',')}`)
  })
}

async function createOfferMockData( 
  addresses: SignerWithAddress[], 
  gammaPacks: Contract, 
  gammaCards: Contract, 
  gammaOffers: Contract) {
      
  console.log('\n----------------------------------')
  console.log('Creating Gamma Offers Mock Data')
  console.log('----------------------------------\n')

  await gammaCards.changeRequireOpenPackSignerValidation(false)

  await gammaOfferBuyPack(addresses[0], gammaPacks, gammaCards, [25,62,94,71,41,77,100,90,3,58,113,28])
  await gammaOfferBuyPack(addresses[0], gammaPacks, gammaCards, [0,1,2,4,5,6,7,8,9,10,11,12])

  await gammaOffers.connect(addresses[0]).createOffer(3, [24,4,5,6,7,8])
  await gammaOffers.connect(addresses[0]).createOffer(25, [24,4,0,119,7,1])
  await gammaOffers.connect(addresses[0]).createOffer(28, [110,32,2])
  await gammaOffers.connect(addresses[0]).createOffer(1, [117,118,119])

  await gammaOfferBuyPack(addresses[1], gammaPacks, gammaCards, [90,91,92,93,94,95,96,97,98,99,100,101])
  await gammaOfferBuyPack(addresses[1], gammaPacks, gammaCards, [102,103,104,105,106,107,108,109,110,111,112])

  await gammaOffers.connect(addresses[1]).createOffer(90, [0,1,2])
  await gammaOffers.connect(addresses[1]).createOffer(102, [32,2,4,5,6,7])

  printOffers(await gammaOffers.getOffers())
  printCardsByUser(addresses[0].address, await gammaCards.getCardsByUser(addresses[0].address))
  printCardsByUser(addresses[1].address, await gammaCards.getCardsByUser(addresses[1].address))

  console.log('Doing one offer exchange...')
  await gammaOffers.confirmOfferExchange(addresses[1].address, 110, addresses[0].address, 28);

  printOffers(await gammaOffers.getOffers())
  printCardsByUser(addresses[0].address, await gammaCards.getCardsByUser(addresses[0].address))
  printCardsByUser(addresses[1].address, await gammaCards.getCardsByUser(addresses[1].address))

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

    if (isHardhat || isLocalhost) {
      // await createAlphaMockData(addresses, contracts.testDAI, contracts.alpha);
      await createGammaMockData(addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards);
      await createOfferMockData (addresses, contracts.gammaPacks, contracts.gammaCards, contracts.gammaOffers);
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
