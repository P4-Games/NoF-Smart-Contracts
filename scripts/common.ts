import "@nomiclabs/hardhat-ethers";
import { ethers, network } from "hardhat"; 
import dotenv from 'dotenv';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import Web3 from 'web3';
import { config } from "hardhat";

export async function getInitData() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
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
  const walletSignaturePrivateKey = process.env.PRIVATE_KEY || ''

  const TestDAI = await ethers.getContractFactory(nofDaiContractName);
  const testDAI = await TestDAI.deploy();
  await testDAI.deployed();
  console.log("TestDAI deployed address:", testDAI.address);

  const Alpha = await ethers.getContractFactory(nofAlphaContractName);
  const alpha = await Alpha.deploy("https://www.example.com", testDAI.address, addresses[0].address);
  await alpha.deployed();
  console.log("Alpha deployed address:", alpha.address);

  const GammaPacks = await ethers.getContractFactory(nofGammaPacksContractName);
  const gammaPacks = await GammaPacks.deploy(testDAI.address, addresses[0].address);
  await gammaPacks.deployed();
  console.log("Gamma deployed Packs address:", gammaPacks.address);

  const GammaCards = await ethers.getContractFactory(nofGammaCardsContractName);
  const gammaCards = await GammaCards.deploy(testDAI.address, gammaPacks.address, "https://www.example.com", addresses[0].address);
  await gammaCards.deployed();
  console.log("Gamma deployed Cards address:", gammaCards.address);
  await gammaPacks.setCardsContract(gammaCards.address);

  console.log(`minting some DAIs for address ${addresses[0].address}`)
  await testDAI._mint(addresses[0].address, ethers.BigNumber.from("900000000000000000000"));

  console.log("To use in .env in nof-landing", gammaCards.address);
  console.log(`
    NEXT_PUBLIC_DAI_ADDRESS='${testDAI.address}'
    NEXT_PUBLIC_ALPHA_ADDRESS='${alpha.address}'
    NEXT_PUBLIC_GAMMA_PACKS_ADDRESS='${gammaPacks.address}'
    NEXT_PUBLIC_GAMMA_CARDS_ADDRESS='${gammaCards.address}'
    NEXT_PUBLIC_ADMIN_ACCOUNTS='${addresses[0].address}'
  `)

  return { testDAI, alpha, gammaPacks, gammaCards, walletSignaturePrivateKey };
  
}


export async function generateSignature(method: number, address: string, packNumber: number) {
  if (method === 1) 
    return generateSignature1(address, packNumber)
  else
  return generateSignature2(address, packNumber)
}

async function generateSignature1(address: string, packNumber: number) {
  
  const web3 = new Web3("https://bsc-dataseed2.binance.org");
  const pack0Data = [25,62,94,71,41,77,100,90,3,58,113,28] // valid only with pack 0

  const accounts: any = config.networks.hardhat.accounts;
  const index: any = 0; // first wallet, increment for next wallets
  const wallet0 = ethers.Wallet.fromMnemonic(accounts.mnemonic, accounts.path + `/${index}`);
  
  // 0xf1dD71895e49b1563693969de50898197cDF3481 es el contract adddress que esta en backend (servicio)
  // y tambiéon en el SC de Gamma Gards para validar la firma. 
  const hash: string = web3.utils.soliditySha3( 
    {type: "address", value: address}, 
    {type: "uint256", value: packNumber}, 
    {type: "uint256[]", value: pack0Data}, 
    {type: "address", value: '0xf1dD71895e49b1563693969de50898197cDF3481'}) || ''; 

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
