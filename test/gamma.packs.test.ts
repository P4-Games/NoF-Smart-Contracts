import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofFixture } from './common'

describe('NoF - Gamma Packs Tests', function () {

  it('Add owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Add owner should revert when adding an existing owner', async () => {
    const { gammaCards, address1 } = await loadFixture(deployNofFixture)
    await gammaCards.addOwner(address1.address)
    await expect(gammaCards.addOwner(address1.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('Remove owner should revert when the address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner (ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('Remove owner should revert when removing self as an owner', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner (address0.address)).to.be.revertedWith("You cannot remove yourself as an owner.")
  });

  it('Remove owner should revert when removing a non-existing owner', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeOwner (nonExistingOwner)).to.be.revertedWith("Address is not an owner.")
  });

  it('Pack owner must be equal to buyer', async function () {
    const { gammaPacks, address0 } = await loadFixture(deployNofFixture)
    const tokenId = await gammaPacks.buyPack({ from: address0.address })
    const packOwner = await gammaPacks.getPackOwner(tokenId.value)
    expect(packOwner).to.equal(address0.address)
  })

  it('Pack could be open by an owner (pack-contract)', async () => {
    const { gammaPacks, address0 } = await loadFixture(deployNofFixture)
    const tokenId = await gammaPacks.buyPack() 
    await gammaPacks.testOpenPack(tokenId.value, address0.address)
  })

  it('Transfer pack twice', async () => {
    const { gammaPacks, address0, address1 } = await loadFixture(deployNofFixture)
    const tokenId = await gammaPacks.buyPacks(4) 
    await expect(tokenId).to.not.be.equals(0)

    let userPacks = await gammaPacks.getPacksByUser(address0.address)
    await expect(userPacks.length).to.be.equals(4)
      
    await gammaPacks.transferPack (address1.address, userPacks[3])
    await expect((await gammaPacks.getPacksByUser(address0.address)).length).to.be.equals(3)
    
    const packsUser1 = await gammaPacks.getPacksByUser(address1.address)
    await expect(packsUser1.length).to.be.equals(1)

    await gammaPacks.testOpenPack(packsUser1[0], address1.address)
    await expect((await gammaPacks.getPacksByUser(address1.address)).length).to.be.equals(0)

    await gammaPacks.transferPack (address1.address, userPacks[2])
    await expect((await gammaPacks.getPacksByUser(address0.address)).length).to.be.equals(2)
    await expect((await gammaPacks.getPacksByUser(address1.address)).length).to.be.equals(1)
  })

  it('Transfer several packs at once', async () => {
    const { gammaPacks, address0, address1 } = await loadFixture(deployNofFixture)
    const tokenId = await gammaPacks.buyPacks(4) 
    await expect(tokenId).to.not.be.equals(0)

    let userPacks = await gammaPacks.getPacksByUser(address0.address)
    await expect(userPacks.length).to.be.equals(4)
      
    await gammaPacks.transferPacks (address1.address, userPacks)
    await expect((await gammaPacks.getPacksByUser(address0.address)).length).to.be.equals(0)
    
    const packsUser1 = await gammaPacks.getPacksByUser(address1.address)
    await expect(packsUser1.length).to.be.equals(4)

    await gammaPacks.testOpenPack(packsUser1[0], address1.address)
    await expect((await gammaPacks.getPacksByUser(address1.address)).length).to.be.equals(3)
  })

  it('Open several packs at once', async () => {
    const { gammaPacks, address0, address1 } = await loadFixture(deployNofFixture)
    const tokenId = await gammaPacks.buyPacks(4) 
    await expect(tokenId).to.not.be.equals(0)

    let userPacks = await gammaPacks.getPacksByUser(address0.address)
    await expect(userPacks.length).to.be.equals(4)

    await gammaPacks.testOpenPacks(userPacks, address0.address)
    await expect((await gammaPacks.getPacksByUser(address1.address)).length).to.be.equals(0)
  })

})
