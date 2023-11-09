import dotenv from 'dotenv'
dotenv.config()

const nofDaiContractName = process.env.NOF_DAI_CONTRACT_NAME || 'NofTestDAIV2'
const nofAlphaContractName = process.env.NOF_ALPHA_CONTRACT_NAME || 'NofAlphaV2'
const nofGammaPacksContractName = process.env.NOF_GAMMA_PACKS_CONTRACT_NAME || 'NofGammaPacksV2'
const nofGammaCardsContractName = process.env.NOF_GAMMA_CARDS_CONTRACT_NAME || 'NofGammaCardsV2'

export { nofDaiContractName, nofAlphaContractName, nofGammaPacksContractName, nofGammaCardsContractName }
