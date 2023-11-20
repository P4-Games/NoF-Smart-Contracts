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
NOF_DAI_CONTRACT_NAME='NofTestDAIV2'
NOF_ALPHA_CONTRACT_NAME='NofAlphaV2'
NOF_GAMMA_PACKS_CONTRACT_NAME='NofGammaPacksV2'
NOF_GAMMA_CARDS_CONTRACT_NAME='NofGammaCardsV3'
NOF_GAMMA_OFFERS_CONTRACT_NAME='NofGammaOffersV1'
# Se dejó en el código dos métodos para hacer una firma de datos.
# El metodo 1 es un custom que se usa de manera local. 
# El método 2 es el que usa al app en los ambientes, desplegado en 
# un micro-servicio de backend.
SIGNATURE_METHOD='1'

# Esta variable contiene una lista (separador: ",") de las wallets addresses
# que han firmado packs.
# El micro-servicio de backend genera una firma. En el SC que llama la landing, 
# se valida esa firma.
# Última wallet seteada en el micro-servicio: 0x20517cf8c140f7f393f92cea6158f57385a75733 
# Se deja seteadas varias, por las distintas wallets que han firmado packs.
MICRO_SERVICE_SIGNATURE_WALLETS_ADDRESSES=''

# Dirección de la wallet del balance receiver que quedará condigurado en el contrato
# gamma-packs
BALANCE_RECEIVER_WALLET_ADDRESS=''

# Lista de direcciones de owners adicionales (al que desplega) para sumar a los contratos 
# (separar los valores por ",")
ADDITIONAL_OWNERS_WALLETS_ADDRESSES=''

# Direcciones de contatos existentes, para no re-desplegar al ejecutar el script deploy.hs
# (usará las definidas en éstas variables)
NOF_DAI_CONTRACT_CURRENT_ADDRESS=''
NOF_ALPHA_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_PACKS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_CARDS_CONTRACT_CURRENT_ADDRESS=''
NOF_GAMMA_OFFERS_CONTRACT_CURRENT_ADDRESS=''

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
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to Mumnbai 
npx hardhat run scripts/deploy.ts --network mumbai

# Solidity Security and Style guides validations with solhint [https://protofire.github.io/solhint/]
npm install -g solhint
solhint 'contracts/**/*.sol'

# Solidity Static Analysis [https://github.com/crytic/slither]
# To install slither =>  https://github.com/crytic/slither#how-to-install
slither .
```

---


## Gamma Logic Detaills

See detaills about gamma Smart Contracts in this [file](./.doc/contracts-info.md)