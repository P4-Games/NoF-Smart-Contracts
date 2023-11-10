import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat"; 
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { generateSignature, getInitData, deployContracts } from "./common";

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

  console.log('buying Pack...')
  const estimatedGas = await gammaPacks.estimateGas.buyPack();
  console.log('buying Pack, estimated gas', estimatedGas)

  const gasLimit = estimatedGas.add(10000) // security-margin
  const tokenId = await gammaPacks.buyPack({ gasLimit, from: addresses[0].address });
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

  console.log('buying 3 Packs...')
  const estimatedGasTenPacks = await gammaPacks.estimateGas.buyPacks(3);
  console.log('buying 3 Packs, estimated gas', estimatedGasTenPacks)

  const gasLimitTenPacks = estimatedGasTenPacks.add(10000) // security-margin
  await gammaPacks.buyPacks(3, { gasLimit: gasLimitTenPacks, from: addresses[0].address });

  console.log('Verifing user\'s packs...')
  const packs:[any] = await gammaPacks.getPacksByUser(addresses[0].address)

  console.log('User\'s packs')
  for (let i = 0; i < packs.length-1; i++) {
    console.log(`\tPack ${i+1} Id: ${packs[i]}`)
  }

  /*
  console.log('Opening Pack with cardData simulating backend signature...')
  if (signatureMethod === '1') {
    // tiene que cambiar la wallet del signer a la misma que hace la 
    // firma en el método generateSignature1  (la wallet 0 de hardhat). 
    // Se hace eso para que luego en el SC, al comparar ambas wallets, 
    // funciones bien (wallet de firma = signer)
    gammaCards.setSigner(addresses[0].address)

    // en el caso de deploy fuera de local, el SC tiene que tener como signer
    // la dirección de la clave privada que usa el micro-servicio:
    // 0x20517cf8c140f7f393f92cea6158f57385a75733 
  }

  const signatureData: any = await generateSignature(signatureMethod, addresses[0].address, 0)
  const packNumber = ethers.BigNumber.from(packs[0]).toNumber()
  const { packet_data, signature } = signatureData

  await gammaCards.openPack(packNumber, packet_data, signature)
  */
  
  console.log('User\'s packs')
  for (let i = 0; i < packs.length-1; i++) {
    console.log(`\tPack ${i+1} Id: ${packs[i]}`)
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
    
    // await createAlphaMockData(addresses, contracts.testDAI, contracts.alpha);

    await createGammaMockData(addresses, contracts.testDAI, contracts.gammaPacks, contracts.gammaCards, contracts.signatureMethod);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
