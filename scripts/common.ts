import '@nomiclabs/hardhat-ethers';
import { ethers, network } from 'hardhat'; 
import dotenv from 'dotenv';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Web3 from 'web3';
import { config } from 'hardhat';

export const isLocalhost = (network.name === 'localhost') || (network.name === '127.0.0.1')
export const isHardhat = (network.name === 'hardhat') 

export async function getInitData() {
  if (isHardhat) {
    console.warn(
      `You are trying to deploy a contract to the Hardhat Network, which
        gets automatically created and destroyed every time. Use the Hardhat
        option --network localhost`
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  const balance = (await deployer.getBalance()).toString()
  const acc = await deployer.getAddress();
  const addresses = await ethers.getSigners()
  console.log(
    `Deploying the contracts with the account ${acc}, current acc balance: ${balance}`
  );

  return addresses
}

export async function deployContracts(wallets: SignerWithAddress[]) {

  dotenv.config(); 

  const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV2'
  const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
  const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
  const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV2'

  const nofDaiContractCurrentAddress = process.env.NOF_DAI_CONTRACT_CURRENT_ADDRESS || ''
  const nofAlphaContractCurrentAddress = process.env.NOF_ALPHA_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaPacksContractCurrentAddress = process.env.NOF_GAMMA_PACKS_CONTRACT_CURRENT_ADDRESS || ''
  const nofGammaCardsContractCurrentAddress = process.env.NOF_GAMMA_CARDS_CONTRACT_CURRENT_ADDRESS || ''

  const signatureMethod = process.env.SIGNATURE_METHOD || '1'
  const microServiceSignatureWalletsAddresses = (process.env.MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES 
      || '0x20517cf8c140f7f393f92cea6158f57385a75733').split(',')
  const additionalOwners = (process.env.ADDITIONAL_OWNERS_WALLETS_ADDRESSES 
      || '0x35dad65F60c1A32c9895BE97f6bcE57D32792E83,0x8a8F5e5ae88532c605921f320a92562c9599fB9E').split(',')
  const balanceReceiverAddress = 
    (isLocalhost || isHardhat) 
      ? wallets[0].address 
      : (process.env.BALANCE_RECEIVER_WALLET_ADDRESS || '0x6b510284C49705eA14e92aD35D86FD3075eC56e0')

  let testDaiAddress = nofDaiContractCurrentAddress;
  let testDAI;
  if (testDaiAddress === '') {
    console.log(`deploying contract ${nofDaiContractName}`)
    const TestDAI = await ethers.getContractFactory(nofDaiContractName);
    testDAI = await TestDAI.deploy();
    await testDAI.deployed();
    testDaiAddress = testDAI.address;
  } else {
    testDAI = await ethers.getContractAt(nofDaiContractName, testDaiAddress);
  }

  let alphaAddress = nofAlphaContractCurrentAddress;
  let alpha;
  if (alphaAddress === '') {
    console.log(`deploying contract ${nofAlphaContractName}`)
    const Alpha = await ethers.getContractFactory(nofAlphaContractName);
    alpha = await Alpha.deploy('https://storage.googleapis.com/nof-alfa/T1', testDaiAddress, balanceReceiverAddress);
    await alpha.deployed();
    alphaAddress = alpha.address;
  } else {
    alpha = await ethers.getContractAt(nofAlphaContractName, alphaAddress);
  }

  let gammaPacksAddress = nofGammaPacksContractCurrentAddress;
  let gammaPacks;
  if (gammaPacksAddress === '') {
    console.log(`deploying contract ${nofGammaPacksContractName}`)
    const GammaPacks = await ethers.getContractFactory(nofGammaPacksContractName);
    gammaPacks = await GammaPacks.deploy(testDaiAddress, balanceReceiverAddress);
    await gammaPacks.deployed();
    gammaPacksAddress = gammaPacks.address;
  } else {
    gammaPacks = await ethers.getContractAt(nofGammaPacksContractName, gammaPacksAddress);
  }

  let gammaCardsAddress = nofGammaCardsContractCurrentAddress;
  let gammaCards;
  if (gammaCardsAddress === '') {
    console.log(`deploying contract ${nofGammaCardsContractName}`)
    const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName);
    gammaCards = await GammaCards.deploy(testDaiAddress, gammaPacksAddress, 
      'https://storage.googleapis.com/nof-gamma/T1', microServiceSignatureWalletsAddresses[0]);
    await gammaCards.deployed();
    gammaCardsAddress = gammaCards.address;
    await gammaPacks.setCardsContract(gammaCardsAddress);
  } else { 
    gammaCards = await ethers.getContractAt(nofGammaCardsContractName, gammaCardsAddress);
  }

  console.log('\nTestDAI deployed address:', testDaiAddress);
  console.log('Alpha deployed address:', alphaAddress);
  console.log('Gamma deployed Packs address:', gammaPacksAddress);
  console.log('Gamma deployed Cards address:', gammaCardsAddress);
  console.log('Alpha balance receiver setted:', balanceReceiverAddress);
  console.log('Gamma Packs balance receiver setted:', balanceReceiverAddress);
  console.log('Gamma Cards micro-services Signature Wallets Addresses setted:', microServiceSignatureWalletsAddresses[0]);

  for (const wallet of wallets) {
    console.log(`\nMinting some DAIs for address ${wallet.address}`)
    await testDAI._mint(wallet.address, ethers.BigNumber.from('900000000000000000000'));
  }

  // se contempla si tiene más de 1 agregado, dado que el primero (posición 0), ya se incorpora en el deploy de gammaCards
  if (microServiceSignatureWalletsAddresses.length > 1) {
    // Se skipea la primera posición que fue incorporada en el deploy de gammaCards
    const additionalSignatureWallets = microServiceSignatureWalletsAddresses.slice(1);
    console.log(`\nAdded these additional signature wallets addresses in Gamma Cards Contract`, additionalSignatureWallets.join(','))
    for (const walletAddress of additionalSignatureWallets) {
      const alreadySigner = await gammaCards.signers(walletAddress);
      if (!alreadySigner) {
        await gammaCards.addSigner(walletAddress);
      }
    }
  }

  if (additionalOwners.length > 0) {
    console.log(`\nAdded these additional owners wallets addresses in Gamma Cards Contract`, additionalOwners.join(','))
    for (const walletAddress of additionalOwners) {
      const alreadyOwner = await gammaCards.owners(walletAddress);
      if (!alreadyOwner) {
        await gammaCards.addOwner(walletAddress);
      }
    }

    console.log(`\nAdded these additional owners wallets addresses in Gamma Packs Contract`, additionalOwners.join(','))
    for (const walletAddress of additionalOwners) {
      const alreadyOwner = await gammaPacks.owners(walletAddress);
      if (!alreadyOwner) {
        await gammaPacks.addOwner(walletAddress);
      }
    }
  }

  console.log('\nFacility text to use in .env in nof-landing:');
  console.log(`
    NEXT_PUBLIC_DAI_ADDRESS='${testDaiAddress}'
    NEXT_PUBLIC_ALPHA_ADDRESS='${alpha.address}'
    NEXT_PUBLIC_GAMMA_PACKS_ADDRESS='${gammaPacks.address}'
    NEXT_PUBLIC_GAMMA_CARDS_ADDRESS='${gammaCards.address}'
    NEXT_PUBLIC_ADMIN_ACCOUNTS='${wallets[0].address}'
  `)

  return { testDAI, alpha, gammaPacks, gammaCards, signatureMethod };
  
}

export async function generateSignature(method: string, address: string, packNumber: number) {
  if (method === '1') 
    return generateSignature1(address, packNumber)
  else
  return generateSignature2(address, packNumber)
}

async function generateSignature1(address: string, packNumber: number) {
  
  const web3 = new Web3('https://bsc-dataseed2.binance.org');
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0

  const accounts: any = config.networks.hardhat.accounts;
  const index: any = 0; // first wallet, increment for next wallets
  const wallet0 = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${index}`);
  
  // 0xf1dD71895e49b1563693969de50898197cDF3481 es el contract adddress que esta en backend (servicio)
  // y tambiéo en el SC de Gamma Gards para validar la firma. Si se despliega un nuevo contrato, no hace
  // falta cambiarlo, dado que esta harcodeado el mismo dato en ambos lugares.
  const hash: string = web3.utils.soliditySha3( 
    {type: 'address', value: address}, 
    {type: 'uint256', value: packNumber}, 
    {type: 'uint256[]', value: pack0Data}, 
    {type: 'address', value: '0xf1dD71895e49b1563693969de50898197cDF3481'}) || ''; 

  const signature = web3.eth.accounts.sign(hash, wallet0.privateKey);
  return { packet_data: pack0Data, signature };
  
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
