import '@nomiclabs/hardhat-ethers';
import { ethers, network } from 'hardhat'; 
import dotenv from 'dotenv';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import Web3 from 'web3';
import { config } from 'hardhat';

const isLocalhost = (network.name === 'localhost') || (network.name === '127.0.0.1')
const isHardhat = (network.name === 'hardhat') 

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
  const [
    address0,
    address1,
    address2,
    address3,
    address4,
    address5,
    address6,
    address7,
    address8,
    address9
  ] = await ethers.getSigners();

  const addresses = [address0,
    address1,
    address2,
    address3,
    address4,
    address5,
    address6,
    address7,
    address8,
    address9
  ]

  console.log(
    `Deploying the contracts with the account ${acc}, current acc balance: ${balance}`
  );

  return addresses
}

export async function deployContracts(addresses: SignerWithAddress[]) {

  dotenv.config(); 

  const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME ||  'NofTestDAIV2'
  const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
  const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
  const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV2'
  const signatureMethod = process.env.SIGNATURE_METHOD || '1'
  const microServiceSignatureWalletsAddresses = (process.env.MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES || '0x20517cf8c140f7f393f92cea6158f57385a75733').split(',')
  const balanceReceiverAddress = 
    (isLocalhost || isHardhat) ? addresses[0].address : (process.env.BALANCE_RECEIVER_WALLET_ADDRESS || '')

  const TestDAI = await ethers.getContractFactory(nofDaiContractName);
  const testDAI = await TestDAI.deploy();
  await testDAI.deployed();

  const Alpha = await ethers.getContractFactory(nofAlphaContractName);
  const alpha = await Alpha.deploy('https://nof.town', testDAI.address, balanceReceiverAddress);
  await alpha.deployed();

  const GammaPacks = await ethers.getContractFactory(nofGammaPacksContractName);
  const gammaPacks = await GammaPacks.deploy(testDAI.address, balanceReceiverAddress);
  await gammaPacks.deployed();

  const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName);
  const gammaCards = await GammaCards.deploy(testDAI.address, gammaPacks.address, 'hhttps://nof.town', microServiceSignatureWalletsAddresses[0]);
  await gammaCards.deployed();
  await gammaPacks.setCardsContract(gammaCards.address);

  console.log('\nTestDAI deployed address:', testDAI.address);
  console.log('Alpha deployed address:', alpha.address);
  console.log('Gamma deployed Packs address:', gammaPacks.address);
  console.log('Gamma deployed Cards address:', gammaCards.address);
  console.log('Alpha balance receiver setted:', balanceReceiverAddress);
  console.log('Gamma Packs balance receiver setted:', balanceReceiverAddress);
  console.log('Gamma Cards micro-services Signature Wallets Addresses setted:', microServiceSignatureWalletsAddresses[0]);

  console.log(`\nMinting some DAIs for address ${addresses[0].address}`)
  await testDAI._mint(addresses[0].address, ethers.BigNumber.from('900000000000000000000'));

  if (microServiceSignatureWalletsAddresses.length > 1) {
    const additionalSignatureWallets = microServiceSignatureWalletsAddresses.slice(1);
    console.log(`\nAdded these additional signature wallets addresses in Gamma Cards Contract`, additionalSignatureWallets.join(','))
    additionalSignatureWallets.forEach(walletAddress => {
      gammaCards.addSigner(walletAddress);
    });
  }

  console.log('\nFacility text to use in .env in nof-landing:', gammaCards.address);
  console.log(`
    NEXT_PUBLIC_DAI_ADDRESS='${testDAI.address}'
    NEXT_PUBLIC_ALPHA_ADDRESS='${alpha.address}'
    NEXT_PUBLIC_GAMMA_PACKS_ADDRESS='${gammaPacks.address}'
    NEXT_PUBLIC_GAMMA_CARDS_ADDRESS='${gammaCards.address}'
    NEXT_PUBLIC_ADMIN_ACCOUNTS='${addresses[0].address}'
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
