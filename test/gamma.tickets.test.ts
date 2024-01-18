import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployNofGammaFixture } from './common'

describe('NoF - Gamma Tickets Tests', function () {
  it('Add Owner should revert when the address is invalid', async () => {
    const { gammaTickets } = await loadFixture(deployNofGammaFixture)
    await expect(gammaTickets.addOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Add Owner should revert when adding an existing owner', async () => {
    const { gammaTickets, address1 } = await loadFixture(deployNofGammaFixture)
    await gammaTickets.addOwner(address1.address)
    await expect(gammaTickets.addOwner(address1.address)).to.be.revertedWith('Address is already an owner.')
  })

  it('Remove Owner should revert when the address is invalid', async () => {
    const { gammaTickets } = await loadFixture(deployNofGammaFixture)
    await expect(gammaTickets.removeOwner(ethers.constants.AddressZero)).to.be.revertedWith('Invalid address.')
  })

  it('Remove Owner should revert when removing self as an owner', async () => {
    const { gammaTickets, address0 } = await loadFixture(deployNofGammaFixture)
    await expect(gammaTickets.removeOwner(address0.address)).to.be.revertedWith(
      'You cannot remove yourself as an owner.'
    )
  })

  it('Remove Owner should revert when removing a non-existing owner', async () => {
    const { gammaTickets } = await loadFixture(deployNofGammaFixture)
    const nonExistingOwner = ethers.Wallet.createRandom().address
    await expect(gammaTickets.removeOwner(nonExistingOwner)).to.be.revertedWith('Address is not an owner.')
  })
})
