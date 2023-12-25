import '@nomiclabs/hardhat-ethers'
import { ethers, network } from 'hardhat' 
import dotenv from 'dotenv'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import Web3 from 'web3'
import { config } from 'hardhat'
import { Contract } from 'ethers'

export const isLocalhost = (network.name === 'localhost') || (network.name === '127.0.0.1')
export const isHardhat = (network.name === 'hardhat') 

export async function getInitData() {
  if (isHardhat) {
    console.warn(
      `You are trying to deploy a contract to the Hardhat Network, which
        gets automatically created and destroyed every time. Use the Hardhat
        option --network localhost`
    )
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners()
  const balance = (await deployer.getBalance()).toString()
  const acc = await deployer.getAddress()
  const addresses = await ethers.getSigners()
  console.log(
    `Deploying the contracts with the account ${acc}, current acc balance: ${ethers.utils.formatEther(balance)}`
  )

  return addresses
}

async function deployContract(contractCurrentAddress: string, contractName: string) {
  let resultContract
  if (contractCurrentAddress === '') {
    console.log(`deploying contract ${contractName}`)
    const GammaPacks = await ethers.getContractFactory(contractName)
    resultContract = await GammaPacks.deploy()
    await resultContract.deployed()
  } else {
    resultContract = await ethers.getContractAt(contractName, contractCurrentAddress)
  }
  return resultContract
}

export async function deployContracts(wallets: SignerWithAddress[]) {

  dotenv.config() 

  const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV3'
  const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV3'
  const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV5'
  const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV3'
  const nofGammaOffersContractName = process.env.NOF_GAMMA_OFFERS_CONTRACT_NAME || 'NofGammaOffersV4'
  const nofGammaTicketsContractName = process.env.NOF_GAMMA_TICKETS_CONTRACT_NAME || 'NofGammaTicketsV1'

  const nofDaiContractCurrentAddress = process.env.NOF_DAI_CONTRACT_CURRENT_ADDRESS || ''
  const nofAlphaContractCurrentAddress = process.env.NOF_ALPHA_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaCardsContractCurrentAddress = process.env.NOF_GAMMA_CARDS_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaPacksContractCurrentAddress = process.env.NOF_GAMMA_PACKS_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaOffersContractCurrentAddress = process.env.NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaTicketsContractCurrentAddress = process.env.NOF_GAMMA_TICKETS_CONTRACT_CURRENT_ADDRESS || ''

  const testDAIContract = await deployContract(nofDaiContractCurrentAddress, nofDaiContractName)
  const alphaContract = await deployContract(nofAlphaContractCurrentAddress, nofAlphaContractName)
  const cardsContract = await deployContract(nofGammaCardsContractCurrentAddress, nofGammaCardsContractName)
  const packsContract = await deployContract(nofGammaPacksContractCurrentAddress, nofGammaPacksContractName)
  const offersContract = await deployContract(nofGammaOffersContractCurrentAddress, nofGammaOffersContractName)
  const ticketsContract = await deployContract(nofGammaTicketsContractCurrentAddress, nofGammaTicketsContractName)

  const signatureMethod = process.env.SIGNATURE_METHOD || '1'
  
  const microServiceSignatureWalletsAddresses = (process.env.MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES 
      || '0x20517cf8c140f7f393f92cea6158f57385a75733').split(',')
  
  const additionalOwners = (process.env.ADDITIONAL_OWNERS_WALLETS_ADDRESSES 
      || '0x35dad65F60c1A32c9895BE97f6bcE57D32792E83,0x8a8F5e5ae88532c605921f320a92562c9599fB9E').split(',')
  
  const balanceReceiverAddress = 
    (isLocalhost || isHardhat) 
      ? wallets[0].address 
      : (process.env.BALANCE_RECEIVER_WALLET_ADDRESS || '0x6b510284C49705eA14e92aD35D86FD3075eC56e0')

  await alphaContract.init(
    'https://storage.googleapis.com/nof-alfa/T1', 
    testDAIContract.address, 
    balanceReceiverAddress
  )

  await cardsContract.init(
    testDAIContract.address, 
    packsContract.address, 
    offersContract.address, 
    ticketsContract.address, 
    'https://storage.googleapis.com/nof-gamma/T1', 
    microServiceSignatureWalletsAddresses[0]
  )

  await packsContract.init(
    testDAIContract.address,
    balanceReceiverAddress,
    cardsContract.address,
    ticketsContract.address
  )

  await offersContract.init(cardsContract.address)
  await ticketsContract.init(packsContract.address, cardsContract.address)

  console.log('\nTestDAI deployed address:', testDAIContract.address)
  console.log('Alpha deployed address:', alphaContract.address)
  console.log('Gamma deployed Cards address:', cardsContract.address)
  console.log('Gamma deployed Packs address:', packsContract.address)
  console.log('Gamma deployed Offers address:', offersContract.address)
  console.log('Gamma deployed Tickets address:', ticketsContract.address)
  console.log('Alpha balance receiver setted:', balanceReceiverAddress)
  console.log('Gamma Packs balance receiver setted:', balanceReceiverAddress)
  console.log('Gamma Cards micro-services Signature Wallets Addresses setted:', microServiceSignatureWalletsAddresses[0])

  const walletsString = wallets.map(item => item.address)
  const addressString = walletsString.join (',')
  console.log(`\nMinting some DAIs for these wallet address:\n ${addressString}`)
  for (const wallet of wallets) {
    await testDAIContract._mint(wallet.address, ethers.BigNumber.from('900000000000000000000'))
  }

  // 0x20517cf8C140F7F393F92cEa6158f57385a75733,0x4c46a8a7cf253e2fb7afe816a4bc273fbdd46c8c,0xfc355c1731a9f4e49a2fe7f9412aa22fa8fde198,0x1836acb4f313f21cbb86ffe2e8e9dfe2d853a657,0x422db8aef9748680d13e29d3495a66254f5e9061
  // se contempla si tiene más de 1 agregado, dado que el primero (posición 0), ya se incorpora en el deploy de gammaCards
  if (microServiceSignatureWalletsAddresses.length > 1) {
    // Se skipea la primera posición que fue incorporada en el deploy de gammaCards
    const additionalSignatureWallets = microServiceSignatureWalletsAddresses.slice(1)
    console.log(`\nAdded these additional signature wallets addresses in Gamma Cards Contract:\n`, additionalSignatureWallets.join(','))
    for (const walletAddress of additionalSignatureWallets) {
      const alreadySigner = await cardsContract.signers(walletAddress)
      if (!alreadySigner) {
        await cardsContract.addSigner(walletAddress)
      }
    }
  }

  if (additionalOwners.length > 0) {
    console.log(`\nAdded these additional owners wallets addresses in Gamma Cards Contract:\m`, additionalOwners.join(','))
    for (const walletAddress of additionalOwners) {
      const alreadyOwner = await cardsContract.owners(walletAddress)
      if (!alreadyOwner) {
        await cardsContract.addOwner(walletAddress)
      }
    }

    console.log(`\nAdded these additional owners wallets addresses in Gamma Packs Contract:\n`, additionalOwners.join(','))
    for (const walletAddress of additionalOwners) {
      const alreadyOwner = await packsContract.owners(walletAddress)
      if (!alreadyOwner) {
        await packsContract.addOwner(walletAddress)
      }
    }
  }

  console.log('\nFacility text to use in .env in nof-landing:')
  console.log(`
    NEXT_PUBLIC_ADMIN_ACCOUNTS='${wallets[0].address}'
    NEXT_PUBLIC_DAI_ADDRESS='${testDAIContract.address}'
    NEXT_PUBLIC_ALPHA_ADDRESS='${alphaContract.address}'
    NEXT_PUBLIC_GAMMA_CARDS_ADDRESS='${cardsContract.address}'
    NEXT_PUBLIC_GAMMA_PACKS_ADDRESS='${packsContract.address}'
    NEXT_PUBLIC_GAMMA_OFFERS_ADDRESS='${offersContract.address}'
    NEXT_PUBLIC_GAMMA_TICKETS_ADDRESS='${ticketsContract.address}'
  `)

  return { 
    testDAIContract, alphaContract, packsContract, 
    cardsContract, offersContract, ticketsContract, signatureMethod 
  }
}

export async function generateSignature(method: string, address: string, packNumber: number) {
  if (method === '1') 
    return generateSignature1(address, packNumber)
  else
  return generateSignature2(address, packNumber)
}

async function generateSignature1(address: string, packNumber: number) {
  
  const web3 = new Web3('https://bsc-dataseed2.binance.org')
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0

  const accounts: any = config.networks.hardhat.accounts
  const index: any = 0 // first wallet, increment for next wallets
  const wallet0 = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${index}`)
  
  // 0xf1dD71895e49b1563693969de50898197cDF3481 es el contract adddress que esta en backend (servicio)
  // y tambiéo en el SC de Gamma Gards para validar la firma. Si se despliega un nuevo contrato, no hace
  // falta cambiarlo, dado que esta harcodeado el mismo dato en ambos lugares.
  const hash: string = web3.utils.soliditySha3( 
    {type: 'address', value: address}, 
    {type: 'uint256', value: packNumber}, 
    {type: 'uint256[]', value: pack0Data}, 
    {type: 'address', value: '0xf1dD71895e49b1563693969de50898197cDF3481'}) || '' 

  const signature = web3.eth.accounts.sign(hash, wallet0.privateKey)
  return { packet_data: pack0Data, signature }
  
} 

async function generateSignature2(address: string, packNumber: number) {
  const api_endpoint = 'https://gamma-microservice-7bteynlhua-uc.a.run.app/'

  try {
    const body = {
      address: address, // address del usuario
      packet_number: packNumber // numero de paquete que se esta abriendo
    }

    const response = await fetch(api_endpoint, {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    const data = await response.json()
    return data
  } catch (e) {
    console.error({ e })
  }
}

export async function gammaDaiBySigner(signer: SignerWithAddress, testDAI: Contract, gammaPacks: Contract) {
  const packPrice = 10000000000000000000
  const TenPacksPrice = ethers.BigNumber.from((packPrice * 10).toString()) 

  console.log(`Minting some DAIs for this wallet address:\n ${signer.address}`)
  await testDAI._mint(signer.address, ethers.BigNumber.from('900000000000000000000'))
 
  console.log('approving in testDai...')
  await testDAI.connect(signer).approve(gammaPacks.address, TenPacksPrice)

  console.log('Verifing testDai balance...')
  const balance = await testDAI.balanceOf(signer.address)
  console.log(`${signer.address} balance: `, balance)

  console.log('Verifing testDai allowance...')
  const allowance = await testDAI.connect(signer).allowance(signer.address, gammaPacks.address)
  console.log(`${signer.address} allowance to use with gamaPackAddress (${gammaPacks.address}): `, allowance)
}