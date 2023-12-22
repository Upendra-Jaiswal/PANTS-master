import { ethers } from 'ethers'

import ERC20_ABI from './erc20.json'
import PAIR_ABI from './pair.json'
import FACTORY_ABI from './factory.json'
import ROUTER_ABI from './router.json'
import STAKING_ABI from './staking.json'
import MIGRATE_ABI from './migrate.json'

import UncheckedJsonRpcSigner from './signer'

const FACTORY_ADDRESS = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'
const ROUTER_ADDRESS = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
export const STAKING_ADDRESS = '0x111C1BF2a6c3Dc8cDbBFc5A5FA3a01E3426e2C14'
export const OLD_STAKING_ADDRESS = '0xb8432d4c985c1a17A50cE0676B97DBd157737c37'
export const SHWEATPANTS_MIGRATION_ADDRESSV2 = '0x4af7c1DFF088Ce058508178054Cef16757Cb4610'
export const ALVIN_MIGRATION_ADDRESSV2 = '0xC41E160CD4FBA75950aD1c827Dea42A993c564A0'
export const SHWEATPANTS_MIGRATION_ADDRESSV3 = '0x29f1C823Ca7ABb894D452796140eC80011cc5612'
export const ALVIN_MIGRATION_ADDRESSV3 = '0x70520F7f6a4978952bA9AA33c5Ce09B9De30Ea5f'



export const TOKEN_ADDRESSES = {
  ETH: 'ETH',
  WXDAI: '0x5B67676a984807a212b1c59eBFc9B3568a474F0a',
  SHWEATPANTS: '0x1Dd8aF2B98a680EA167ccBE8A43a18395F9d7597'
    // ALVIN: '0x50DBde932A94b0c23D27cdd30Fbc6B987610c831',
    // SHWEATPANTSV2: '0x73C6927063338170D794DC929253edb09f533B8d',
    // ALVINV2: '0xf9bb1049378A3462E61Bba502530e5Ed62469925',
    // SHWEATPANTSV1: '0x898e8897437d7245a2d09a29b2cd06a2c1ca388b',
    // ALVINV1: '0x3008Ff3e688346350b0C07B8265d256dddD97215',
    // HNY: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
    // PRTCLE: '0xb5d592f85ab2d955c25720ebe6ff8d4d1e1be300'
}

export const STAKING_ADDRESSES = {
  HNY: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
  PRTCLE: '0xb5d592f85ab2d955c25720ebe6ff8d4d1e1be300',
  HNYPRTCLE: '0xaaefc56e97624b57ce98374eb4a45b6fd5ffb982'
}

export const TOKEN_SYMBOLS = Object.keys(TOKEN_ADDRESSES).reduce((o, k) => {
  o[k] = k
  return o
}, {})

export const STAKING_SYMBOLS = Object.keys(STAKING_ADDRESSES).reduce((o, k) => {
  o[k] = k
  return o
}, {})
export const ERROR_CODES = [
  'INVALID_AMOUNT',
  'INVALID_TRADE',
  'INSUFFICIENT_ETH_GAS',
  'INSUFFICIENT_SELECTED_TOKEN_BALANCE',
  'INSUFFICIENT_ALLOWANCE'
].reduce((o, k, i) => {
  o[k] = i
  return o
}, {})

export const TRADE_TYPES = ['BUY', 'SELL', 'UNLOCK', 'REDEEM'].reduce((o, k, i) => {
  o[k] = i
  return o
}, {})

export function isAddress(value) {
  try {
    ethers.utils.getAddress(value)
    return true
  } catch {
    return false
  }
}

// account is optional
export function getProviderOrSigner(library, account) {
  return account ? new UncheckedJsonRpcSigner(library.getSigner(account)) : library
}

// account is optional
export function getContract(address, ABI, library, account) {
  if (!isAddress(address) || address === ethers.constants.AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new ethers.Contract(address, ABI, getProviderOrSigner(library, account))
}

export function getTokenContract(tokenAddress, library, account) {
  return getContract(tokenAddress, ERC20_ABI, library, account)
}

export function getPairContract(pairAddress, library, account) {
  return getContract(pairAddress, PAIR_ABI, library, account)
}

export function getRouterContract(library, account) {
  return getContract(ROUTER_ADDRESS, ROUTER_ABI, library, account)
}

export function getStakingContract(library, account) {
  return getContract(STAKING_ADDRESS, STAKING_ABI, library, account)
}

export function getOldStakingContract(library, account) {
  return getContract(OLD_STAKING_ADDRESS, STAKING_ABI, library, account)
}

export function getMigrationContract(tokenSymbol, version, library, account) {
  if (tokenSymbol === 'SHWEATPANTS') {
    if (version === 2) {
      return getContract(SHWEATPANTS_MIGRATION_ADDRESSV2, MIGRATE_ABI, library, account)
    } else if (version === 3) {
      return getContract(SHWEATPANTS_MIGRATION_ADDRESSV3, MIGRATE_ABI, library, account)
    }
  } else {
    if (version === 2) {
      return getContract(ALVIN_MIGRATION_ADDRESSV2, MIGRATE_ABI, library, account)
    } else if (version === 3) {
      return getContract(ALVIN_MIGRATION_ADDRESSV3, MIGRATE_ABI, library, account)
    }
  }
}

export async function getTokenPairAddressFromFactory(tokenAddressA, tokenAddressB, library, account) {
  return getContract(FACTORY_ADDRESS, FACTORY_ABI, library, account).getPair(tokenAddressA, tokenAddressB)
}

// get the ether balance of an address
export async function getEtherBalance(address, library) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'`)
  }

  return library.getBalance(address)
}

// get the token balance of an address
export async function getTokenBalance(tokenAddress, address, library) {
  if (!isAddress(tokenAddress) || !isAddress(address)) {
    throw Error(`Invalid 'tokenAddress' or 'address' parameter '${tokenAddress}' or '${address}'.`)
  }

  return getContract(tokenAddress, ERC20_ABI, library).balanceOf(address)
}

export async function getTokenAllowance(address, tokenAddress, spenderAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress) || !isAddress(spenderAddress)) {
    throw Error(
      "Invalid 'address' or 'tokenAddress' or 'spenderAddress' parameter" +
        `'${address}' or '${tokenAddress}' or '${spenderAddress}'.`
    )
  }
  return getContract(tokenAddress, ERC20_ABI, library).allowance(address, spenderAddress)
}

export async function getStakedToken(address, tokenAddress, isLiquidity, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }
  if (isLiquidity) {
    return getContract(STAKING_ADDRESS, STAKING_ABI, library).accountLPStaked(tokenAddress, address)
  } else {
    return getContract(STAKING_ADDRESS, STAKING_ABI, library).accountTokenStaked(tokenAddress, address)
  }
}

export async function getOldStakedToken(address, tokenAddress, isLiquidity, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }
  if (isLiquidity) {
    return getContract(OLD_STAKING_ADDRESS, STAKING_ABI, library).accountLPStaked(tokenAddress, address)
  } else {
    return getContract(OLD_STAKING_ADDRESS, STAKING_ABI, library).accountTokenStaked(tokenAddress, address)
  }
}

export async function getStakedRewards(address, tokenAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).reward(address, tokenAddress)
}

export async function getOldStakedRewards(address, tokenAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }

  return getContract(OLD_STAKING_ADDRESS, STAKING_ABI, library).reward(address, tokenAddress)
}

export async function getTotalStaked(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error("Invalid 'tokenAddress' parameter" + `'${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).totalStaked(tokenAddress)
}

export async function getOldTotalStaked(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error("Invalid 'tokenAddress' parameter" + `'${tokenAddress}'.`)
  }

  return getContract(OLD_STAKING_ADDRESS, STAKING_ABI, library).totalStaked(tokenAddress)
}

export async function getDripp(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error("Invalid 'tokenAddress' parameter" + `'${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).getDripp(tokenAddress)
}

export function amountFormatter(amount, baseDecimals = 18, displayDecimals = 3, useLessThan = true) {
  if (baseDecimals > 18 || displayDecimals > 18 || displayDecimals > baseDecimals) {
    throw Error(`Invalid combination of baseDecimals '${baseDecimals}' and displayDecimals '${displayDecimals}.`)
  }

  // if balance is falsy, return undefined
  if (!amount) {
    return undefined
  }
  // if amount is 0, return
  else if (amount.isZero()) {
    return '0'
  }
  // amount > 0
  else {
    // amount of 'wei' in 1 'ether'
    const baseAmount = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(baseDecimals))

    const minimumDisplayAmount = baseAmount.div(
      ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(displayDecimals))
    )

    // if balance is less than the minimum display amount
    if (amount.lt(minimumDisplayAmount)) {
      return useLessThan
        ? `<${ethers.utils.formatUnits(minimumDisplayAmount, baseDecimals)}`
        : `${ethers.utils.formatUnits(amount, baseDecimals)}`
    }
    // if the balance is greater than the minimum display amount
    else {
      const stringAmount = ethers.utils.formatUnits(amount, baseDecimals)

      // if there isn't a decimal portion
      if (!stringAmount.match(/\./)) {
        return stringAmount
      }
      // if there is a decimal portion
      else {
        const [wholeComponent, decimalComponent] = stringAmount.split('.')
        const roundUpAmount = minimumDisplayAmount.div(ethers.constants.Two)
        const roundedDecimalComponent = ethers.utils
          .bigNumberify(decimalComponent.padEnd(baseDecimals, '0'))
          .add(roundUpAmount)
          .toString()
          .padStart(baseDecimals, '0')
          .substring(0, displayDecimals)

        // decimals are too small to show
        if (roundedDecimalComponent === '0'.repeat(displayDecimals)) {
          return wholeComponent
        }
        // decimals are not too small to show
        else {
          return `${wholeComponent}.${roundedDecimalComponent.toString().replace(/0*$/, '')}`
        }
      }
    }
  }
}
