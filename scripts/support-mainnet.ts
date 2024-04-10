import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat' 
import { Contract } from 'ethers'

async function addOwner(owner: string, contract: Contract) { 
  let alreadyOwner = await contract.isOwner(owner)
  if (!alreadyOwner) {
    await contract.addOwner(owner)
    console.log(`${owner} added as owner`) 
  } else {
    console.log(`${owner} is already an owner`) 
  }
}

async function changeBalanceReceiver(address: string, contract: Contract) {
  await contract.changeBalanceReceiver(address)
  console.log(`${address} setted as balance receiver`)
}

async function process() { 
  const owner= '0xB688CD6b039081521a01e779833C3b20cF8D7949'
  const balanceReceiver='0x189A8E9c3408312A3Cf2cA2747238104Cf8e0eb6'

  const cardsContract = await ethers.getContractAt('NofGammaCardsV5', '0x0a703481a0C67B9A4EE0EE49945F193f117F7505')
  const packsContract = await ethers.getContractAt('NofGammaPacksV3', '0x78E491965a1A8646643126A38C8217CfA27F2339')
  const offersContract = await ethers.getContractAt('NofGammaOffersV4', '0x94Ac8Cb81Ef3c3B056dca42974bF8A57A7B9BA03')
  const ticketsContract = await ethers.getContractAt('NofGammaTicketsV1', '0x0DC4f203E9113018010720484d35a4bfa1c0beA5')

  await addOwner(owner, cardsContract)
  await addOwner(owner, packsContract)
  await addOwner(owner, offersContract)
  await addOwner(owner, ticketsContract)
  await changeBalanceReceiver(balanceReceiver, packsContract)
}

process()

