import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofFixture, PackDataType } from './common'

describe('NoF - Gamma Cards Tests', function () {

  async function getOnePackData(gammaPacks: any, gammaCards: any, address0: any): Promise<PackDataType> {
    const tokenId = await gammaPacks.buyPack({ from: address0.address })
    const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0
    await gammaCards.changeRequireOpenPackSignerValidation(false)
    await gammaCards.testOpenPack(tokenId.value, pack0Data)

    const cardData: PackDataType = await gammaCards.getCardsByUser(address0.address)
    return cardData
  }

  it('addOwner should revert when address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('addOwner should revert when adding an existing owner', async () => {
    const { gammaCards, address1 } = await loadFixture(deployNofFixture)
    await gammaCards.addOwner(address1.address)
    await expect(gammaCards.addOwner(address1.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('removeOwner should revert when address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('removeOwner should revert when removing self as an owner', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeOwner(address0.address)).to.be.revertedWith("You cannot remove yourself as an owner.")
  });

  it('removeOwner should revert when removing a non-existing owner', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeOwner(nonExistingOwner)).to.be.revertedWith("Address is not an owner.")
  });

  it('Pack could be open by its owner (card-contract)', async () => {
    const { gammaPacks, gammaCards, address0 } = await loadFixture(deployNofFixture)
    const packData: PackDataType = await getOnePackData(gammaPacks, gammaCards, address0)
    expect(packData.length).not.equal(0)
  })

  it('addSigner should revert when address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addSigner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('addSigner should revert when adding an existing signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.addSigner(address0.address)).to.be.revertedWith("Address is already an owner.")
  });

  it('removeSigner should revert when address is invalid', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeSigner(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address.")
  });

  it('removeSigner should revert when removing self as a signer', async () => {
    const { gammaCards, address0 } = await loadFixture(deployNofFixture)
    await expect(gammaCards.removeSigner(address0.address)).to.be.revertedWith("You cannot remove yourself as a signer.")
  });

  it('removeSigner should revert when removing a non-existing signer', async () => {
    const { gammaCards } = await loadFixture(deployNofFixture)
    const nonExistingSigner = ethers.Wallet.createRandom().address
    await expect(gammaCards.removeSigner(nonExistingSigner)).to.be.revertedWith("Address is not an signer.")
  });

})
