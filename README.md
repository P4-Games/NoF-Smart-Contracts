![](https://img.shields.io/badge/Solidity-informational?style=flat&logo=solidity&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/Hardhat-informational?style=flat&logo=hardhat&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/JavaScript-informational?style=flat&logo=javascript&logoColor=white&color=6aa6f8)
![](https://img.shields.io/badge/Typescript-informational?style=flat&logo=typescript&logoColor=white&color=6aa6f8)


# NoF Smart Contracts

## Requirements

The App requires:

- [Node.js](https://nodejs.org/) v16+ to run (^16.14.2).
- [Yarn.js](https://classic.yarnpkg.com/en/docs/install) v1+ to run (^1.22.19).
- [hardhat](https://hardhat.org/)

- You could check the version of packages (node, yarn) with these commands:

```sh
node -v
yarn -v
```

## Install the dependencies

```sh
- yarn install # with yarn
- npm i OR npm i --legacy-peer-deps # with NPM
```

If you have some trouble with dependencies, try this:

```sh
set http_proxy=
set https_proxy=
npm config rm https-proxy
npm config rm proxy
npm config set registry "https://registry.npmjs.org"
yarn cache clean
yarn config delete proxy
yarn --network-timeout 100000
```

Create a .env file running the command in terminal

```sh
touch .env
```

## Environment variables

The environment variables below needs to be set in the .env file when the project is running locally.

```sh
INFURA_ID={your infura project id}
ALCHEMY_ID={your infura api key}
PUBLIC_ADDRESS={your wallet address}
PRIVATE_KEY={your private key to deploy SCs}
MNEMONIC={your mnemoic words}
NOF_DAI_CONTRACT_NAME='NofTestDAIV2'
NOF_ALPHA_CONTRACT_NAME='NofAlphaV2'
NOF_GAMMA_PACKS_CONTRACT_NAME='NofGammaPacksV2'
NOF_GAMMA_CARDS_CONTRACT_NAME='NofGammaCardsV3'
NOF_GAMMA_OFFERS_CONTRACT_NAME='NofGammaOffersV1'

# Two methods were left in the code to create a data signature.
# Method 1 is a custom one used locally.
# Method 2 is used by the app in environments, deployed in a backend micro-service.
SIGNATURE_METHOD='1'

# This variable contains a list (separator: ",") of wallet addresses
# that have signed packs.
# The backend micro-service generates a signature. In the smart contract calling the landing,
# that signature is validated.
# Last wallet set in the micro-service: 0x20517cf8c140f7f393f92cea6158f57385a75733
# Multiple wallets are set due to different wallets that have signed packs.
MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES=''

# Address of the wallet of the balance receiver that will be configured in the gamma-packs contract
BALANCE_RECEIVER_WALLET_ADDRESS=''

# List of additional owner addresses (to the deployer) to add to the contracts
# (separate values by ",")
ADDITIONAL_OWNERS_WALLETS_ADDRESSES=''

# Addresses of existing contracts, to avoid re-deployment when executing the deploy.hs script
# (it will use the ones defined in these variables)
NOF_DAI_CONTRACT_CURRENT_ADDRESS=''
NOF_ALPHA_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_CARDS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_PACKS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_LIB_PACK_VERIFIER_CONTRACT_NAME=''
NOF_GAMMA_LIB_STRING_UTILS_CONTRACT_NAME=''
NOF_GAMMA_LIB_OWNERS_MGMT_CONTRACT_NAME=''

# Addresses to mint DAIs using a script (scripts/support-mint-dais.ts)
NOF_DAI_MINT_EXTRA_WALLET_ADDRESSES=''

# Just a flag to enable ('1') print to console or not ('0' - default -)
PRINT_LOG='0'
```

> Note: You can find more info about the other required `.env` variables inside the `example_env` file.


## Commands

```shell
# Run testnet
yarn hardhat node

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy to local
npx hardhat run scripts/deploy.ts

# Deploy to Testnet 
npx hardhat run scripts/deploy.ts --network amoy

# Deploy Mock Data (local)
npx hardhat run scripts/deploy-mock-data.ts


# Solidity Security and Style guides validations with solhint [https://protofire.github.io/solhint/]
npm install -g solhint
solhint 'contracts/**/*.sol'

# Solidity Static Analysis [https://github.com/crytic/slither]
# To install slither =>  https://github.com/crytic/slither#how-to-install
slither .
```


## Gamma Logic Detaills

See detaills about gamma Smart Contracts in this [file](./.doc/contracts-info.md)

## Deployed Contracts last Addresses

NOTA: The ERC20 token being used is DAI, the official addresses of the Mainnet and Testnet smart contracts of the different networks can be found in the references (at the end of this file). Also the faucets for testnet.

Alternatively for testnet, the source code of the DAI contract is in this repository (contracts folder) to deploy your own and avoid collecting cents from faucets.

### Amoy
* DAI: 0xd5654b986d5aDba8662c06e847E32579078561dC
* Alpha: 0xBA5E2aF09e39CC36dfBc9530c4d4C89d5C44d323
* Gamma Cards: 0xe6C812381DF5532A4bA4dA27baA1889adf67eec4
* Gamma Cards NFT: 0xCcF821c87bE912984bCb952A36Fdfca066a925F8
* Gamma Packs: 0xc616ac2191C6012791d3aBFA0e8f372579986090
* Gamma Offers: 0x7DC00081F078D64B7b02535d82D3b6041D79Ce32
* Gamma Tickets: 0xCD177Fa01b249Ee8ca1afF0136c06cD279E8Bf3e

### Mumbai 
* DAI: 0xEa4c35c858E15Cef77821278A88435dE57bc8707
* Alpha: 0x816EA704F9bEf91284bA72bEBdAC1d1c5788246b
* Gamma Cards: 0x394Fc1975972de88806b2E81Ed53f3E020f29D09
* Gamma Cards NFT: 0xe90FFf9825159e9Ce88f2Df3d766666CaD9DdF3a
* Gamma Packs: 0xfb4C387227d3692Be50376ff930472294ADEcED8
* Gamma Offers: 0x1eDB114Bb7A0CBaDA9c9550BD2F3F1bFC08Bd7a7
* Gamma Tickets: 0x091C994c5766D79bF592e08C71D49C49Eaf1DCee

### Bsc Tesnet
* DAI: 0x1ba960c6f624eC8d3fA3ACC4aFaF867538afd787
* Alpha: 0x56e14bf3adBE4C7566b4F9dCC9acc264429f5DC9
* Gamma Cards: 0x369443c3a885b6687d0f2a2Dc97b4EC69b9d90b3
* Gamma Cards NFT: 0x8842E2A0bF1ed60b360c4Ea46C0F1beBC8f5e64d
* Gamma Packs: 0xA62A947c0BD0A14317A6EAd7e32b227f4F9C36ef
* Gamma Offers: 0x4C1d15c7EcEDF52eE7073CeD26b0A6c482b27c69
* Gamma Tickets: 0xC67963E0742074bfa74610D28663FB3a524201D8

### OpBNB Testnet
* DAI: 0xE3Afd0e2b6b955a56A1823039DE577d3ce7B15BC
* Alpha: 0xaAf52b86Cb71c14bd01eC6AC88481BC94470fFD7
* Gamma Cards: 0x4a65B5138fCaBFE8a7c676688E9884F1eBdc1906
* Gamma Cards NFT: 0x28C768b53b051989c0952FcAC7167Ad9ff1C18A5
* Gamma Packs: 0xd792e3040FaCa21E0a7414422DeC6000Cc66BB79
* Gamma Offers: 0xB90B462d5c609CC548a8135C264b212688A9Fe1f
* Gamma Tickets: 0xa7ec2fd75cAfd694866AF76e865D8b34b24CB5D8

### Polygon Mainet

* DAI: 0x8f3cf7ad23cd3cadbd9735aff958023239c6a063 (official makerDAO contract address)
* Alpha: 0x5A2ccC423C0C36A1B05a080eb4972993a1Dd0980
* Gamma Cards: 0x0a703481a0C67B9A4EE0EE49945F193f117F7505
* Gamma Cards NFT: 0x7543d7d265A3aEAEE894804f2426Bfb2e24bca36
* Gamma Packs: 0x78E491965a1A8646643126A38C8217CfA27F2339 
* Gamma Offers: 0x94Ac8Cb81Ef3c3B056dca42974bF8A57A7B9BA03
* Gamma Tickets: 0x0DC4f203E9113018010720484d35a4bfa1c0beA5

### BSC Mainet

(not yet)

* DAI: 0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3 (official makerDAO contract address)
* Alpha:
* Gamma Cards:
* Gamma Cards NFT:
* Gamma Packs: 
* Gamma Offers: 
* Gamma Tickets: 


# Contribution

Thank you for considering helping out with the source code! We welcome contributions from anyone on the internet, and are grateful for even the smallest of fixes!

If you'd like to contribute to NoF, please fork, fix, commit and send a pull request for the maintainers to review and merge into the main code base. If you wish to submit more complex changes though, please check up with the [core devs](https://github.com/P4-Games/NoF-Smart-Contracts/graphs/contributors) first to ensure those changes are in line with the general philosophy of the project and/or get some early feedback which can make both your efforts much lighter as well as our review and merge procedures quick and simple.

Please make sure your contributions adhere to our [coding guidelines](./.doc/contribution.md).

## Contributors

[P4Troy](https://github.com/mpefaur) - [magnetto90](https://github.com/magnetto90) - [tomasfrancisco](https://github.com/tomasfrancizco)  - [Magehernan](https://github.com/Magehernan) - [dappsar](https://github.com/dappsar)

see more in: https://github.com/P4-Games/NoF-Smart-Contracts/graphs/contributors


## Links

### Faucets

* Matic Faucet on Amoy:
    - https://www.alchemy.com/faucets/polygon-amoy
    - https://faucet.trade/polygon-amoy-matic-faucet
    - https://learnweb3.io/faucets/polygon_amoy/ 

* Matic Faucet on Mumbai: 
    - https://mumbaifaucet.com/

* BNB & DAI faucet on BSC: 
    - https://www.bnbchain.org/en/testnet-faucet

* DAI faucet on Mumbai: 
    - https://faucet.paradigm.xyz/
    - https://staging.aave.com/faucet/ (get DAI on Sepolian and then transfer to Mumbai with bridge)

* Get BNB & DAI on opBNB with Bridge (BNB-opBNB): 
    - https://opbnb-testnet-bridge.bnbchain.org/deposit

### Maker DAO (DAI) Contracts Addresses

* MakerDAO (DAI) Testnet:
    - Mumbai: https://mumbai.polygonscan.com/address/0x001b3b4d0f3714ca98ba10f6042daebf0b1b7b6f  
    - BSC-testnet: https://testnet.bscscan.com/address/0xec5dcb5dbf4b114c9d0f65bccab49ec54f6a0867
    - opBNB-testinet:  

* MakerDAO (DAI) Mainnet: 
    - source info: https://www.coingecko.com/en/coins/dai
    - Polygon: https://polygonscan.com/token/0x8f3cf7ad23cd3cadbd9735aff958023239c6a063
    - BSC: https://bscscan.com/token/0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3
    - opBNB: 


### Bridges

* Bridger Finder
    - https://app.findmybridge.com/finder/2863311531
    - https://testnet.meson.fi/
