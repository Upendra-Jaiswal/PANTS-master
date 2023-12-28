import React, { useState, useCallback, useEffect } from 'react'
import { useWeb3Context } from 'web3-react'
import { ethers, BigNumber } from 'ethers'
import buyburnabi from '../../utils/buyburn.json'

import {
  TOKEN_SYMBOLS,
  TOKEN_ADDRESSES,
  ERROR_CODES,
  STAKING_ADDRESSES,
  STAKING_ADDRESS,
  STAKING_SYMBOLS,
  SHWEATPANTS_MIGRATION_ADDRESSV2,
  ALVIN_MIGRATION_ADDRESSV2,
  SHWEATPANTS_MIGRATION_ADDRESSV3,
  ALVIN_MIGRATION_ADDRESSV3
} from '../../utils'
import {
  useTokenContract,
  usePairContract,
  useRouterContract,
  useStakingContract,
  useMigrationContract,
  useAddressBalance,
  useAddressAllowance,
  usePairReserves,
  usePairAllowance,
  useTotalSupply,
  useOldStakingContract,
  useStakedToken
} from '../../hooks'
import Body from '../Body'
import Stats from '../Stats'
import Status from '../Status'
import Staking from '../Staking'
import Migrate from '../Migrate'

// denominated in bips
const GAS_MARGIN = ethers.utils.bigNumberify(1000)

export function calculateGasMargin(value, margin) {
  const offset = value.mul(margin).div(ethers.utils.bigNumberify(10000))
  return value.add(offset)
}

// denominated in seconds
const DEADLINE_FROM_NOW = 60 * 15

// denominated in bips
const ALLOWED_SLIPPAGE = ethers.utils.bigNumberify(200)

function calculateSlippageBounds(value) {
  const offset = value.mul(ALLOWED_SLIPPAGE).div(ethers.utils.bigNumberify(10000))
  const minimum = value.sub(offset)
  const maximum = value.add(offset)
  return {
    minimum: minimum.lt(ethers.constants.Zero) ? ethers.constants.Zero : minimum,
    maximum: maximum.gt(ethers.constants.MaxUint256) ? ethers.constants.MaxUint256 : maximum
  }
}

// this mocks the getInputPrice function, and calculates the required output
function calculateEtherTokenOutputFromInput(inputAmount, inputReserve, outputReserve) {
  const inputAmountWithFee = inputAmount.mul(ethers.utils.bigNumberify(997))
  const numerator = inputAmountWithFee.mul(outputReserve)
  const denominator = inputReserve.mul(ethers.utils.bigNumberify(1000)).add(inputAmountWithFee)
  return numerator.div(denominator)
}

// this mocks the getOutputPrice function, and calculates the required input
function calculateEtherTokenInputFromOutput(outputAmount, inputReserve, outputReserve) {
  const numerator = inputReserve.mul(outputAmount).mul(ethers.utils.bigNumberify(1000))
  const denominator = outputReserve.sub(outputAmount).mul(ethers.utils.bigNumberify(997))
  return numerator.div(denominator).add(ethers.constants.One)
}

// get exchange rate for a token/ETH pair
function getExchangeRate(inputValue, outputValue, invert = false) {
  const inputDecimals = 18
  const outputDecimals = 18

  if (inputValue && inputDecimals && outputValue && outputDecimals) {
    const factor = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))

    if (invert) {
      return inputValue
        .mul(factor)
        .div(outputValue)
        .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
        .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
    } else {
      return outputValue
        .mul(factor)
        .div(inputValue)
        .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
        .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
    }
  }
}

function calculateAmount(
  inputTokenSymbol,
  outputTokenSymbol,
  drippAmount,
  reserveDrippETH,
  reserveDrippToken,
  reserveSelectedTokenETH,
  reserveSelectedTokenToken
) {
  // eth to token - buy
  if (
    inputTokenSymbol === TOKEN_SYMBOLS.ETH &&
    (outputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || outputTokenSymbol === TOKEN_SYMBOLS.ALVIN)
  ) {
    const amount = calculateEtherTokenInputFromOutput(drippAmount, reserveDrippETH, reserveDrippToken)
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  }

  // token to eth - sell
  if (
    (inputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || inputTokenSymbol === TOKEN_SYMBOLS.ALVIN) &&
    outputTokenSymbol === TOKEN_SYMBOLS.ETH
  ) {
    const amount = calculateEtherTokenOutputFromInput(drippAmount, reserveDrippToken, reserveDrippETH)
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  }
  // token to token - buy or sell
  const buyingDripp = outputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || outputTokenSymbol === TOKEN_SYMBOLS.ALVIN

  if (buyingDripp) {
    // eth needed to buy x socks
    const intermediateValue = calculateEtherTokenInputFromOutput(drippAmount, reserveDrippETH, reserveDrippToken)
    // calculateEtherTokenOutputFromInput
    if (intermediateValue.lte(ethers.constants.Zero) || intermediateValue.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    // tokens needed to buy x eth
    const amount = calculateEtherTokenInputFromOutput(
      intermediateValue,
      reserveSelectedTokenToken,
      reserveSelectedTokenETH
    )
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  } else {
    // eth gained from selling x socks
    const intermediateValue = calculateEtherTokenOutputFromInput(drippAmount, reserveDrippToken, reserveDrippETH)
    if (intermediateValue.lte(ethers.constants.Zero) || intermediateValue.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    // tokens yielded from selling x eth
    const amount = calculateEtherTokenOutputFromInput(
      intermediateValue,
      reserveSelectedTokenETH,
      reserveSelectedTokenToken
    )
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  }
}

export default function Main({ stats, status, staking, migration }) {
  const { library, account } = useWeb3Context()

  // selected token
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState(TOKEN_SYMBOLS.ETH)
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState(STAKING_SYMBOLS.PRTCLE)

  //get router contact
  const routerContract = useRouterContract(account)

  //get Staking contracts
  const stakingContract = useStakingContract(account)
  const stakingContractOld = useOldStakingContract(account)
  const shweatpantsMigrationContractV2 = useMigrationContract('SHWEATPANTS', 2, account)
  const alvinMigrationContractV2 = useMigrationContract('ALVIN', 2, account)
  const shweatpantsMigrationContractV3 = useMigrationContract('SHWEATPANTS', 3, account)
  const alvinMigrationContractV3 = useMigrationContract('ALVIN', 3, account)

  // get exchange contracts
  const pairContractSHWEATPANTS = usePairContract(
    TOKEN_ADDRESSES.SHWEATPANTS,
    selectedTokenSymbol == 'ETH' ? TOKEN_ADDRESSES['WXDAI'] : TOKEN_ADDRESSES[selectedTokenSymbol]
  )
  const pairContractALVIN = usePairContract(
    TOKEN_ADDRESSES.ALVIN,
    selectedTokenSymbol == 'ETH' ? TOKEN_ADDRESSES['WXDAI'] : TOKEN_ADDRESSES[selectedTokenSymbol]
  )
  // get token contracts
  const tokenContractSHWEATPANTS = useTokenContract(TOKEN_ADDRESSES.SHWEATPANTS)
  const tokenContractALVIN = useTokenContract(TOKEN_ADDRESSES.ALVIN)
  const tokenContractSHWEATPANTSV1 = useTokenContract(TOKEN_ADDRESSES.SHWEATPANTSV1)
  const tokenContractALVINV1 = useTokenContract(TOKEN_ADDRESSES.ALVINV1)
  const tokenContractSHWEATPANTSV2 = useTokenContract(TOKEN_ADDRESSES.SHWEATPANTSV2)
  const tokenContractALVINV2 = useTokenContract(TOKEN_ADDRESSES.ALVINV2)
  const tokenContractSelectedToken = useTokenContract(TOKEN_ADDRESSES[selectedTokenSymbol])
  const tokenContractStakingTokens = {}
  tokenContractStakingTokens['HNY'] = useTokenContract(STAKING_ADDRESSES['HNY'])
  tokenContractStakingTokens['PRTCLE'] = useTokenContract(STAKING_ADDRESSES['PRTCLE'])
  tokenContractStakingTokens['HNYPRTCLE'] = useTokenContract(STAKING_ADDRESSES['HNYPRTCLE'])

  // get balances
  const balanceETH = useAddressBalance(account, TOKEN_ADDRESSES.ETH)
  const balanceSHWEATPANTS = useAddressBalance(account, TOKEN_ADDRESSES.SHWEATPANTS)
  const balanceALVIN = useAddressBalance(account, TOKEN_ADDRESSES.ALVIN)
  const balanceSelectedToken = useAddressBalance(account, TOKEN_ADDRESSES['ETH'])
  const balanceContractShweatpants = useAddressBalance(STAKING_ADDRESS, TOKEN_ADDRESSES.SHWEATPANTS)
  const balanceContractAlvin = useAddressBalance(STAKING_ADDRESS, TOKEN_ADDRESSES.ALVIN)

  // totalsupply
  const totalSHWEATPANTSSupply = useTotalSupply(tokenContractSHWEATPANTS)
  const totalALVINSupply = useTotalSupply(tokenContractALVIN)

  // get allowances
  const [allowanceSHWEATPANTS, allowanceSHWEATPANTSSelectedToken] = usePairAllowance(
    account,
    TOKEN_ADDRESSES.SHWEATPANTS,
    selectedTokenSymbol == 'ETH' ? TOKEN_ADDRESSES['WXDAI'] : TOKEN_ADDRESSES[selectedTokenSymbol]
  )
  const [allowanceALVIN, allowanceALVINSelectedToken] = usePairAllowance(
    account,
    TOKEN_ADDRESSES.ALVIN,
    selectedTokenSymbol == 'ETH' ? TOKEN_ADDRESSES['WXDAI'] : TOKEN_ADDRESSES[selectedTokenSymbol]
  )

  // get reserves
  const reserveSHWEATPANTSETH = useAddressBalance(
    pairContractSHWEATPANTS && pairContractSHWEATPANTS.address,
    TOKEN_ADDRESSES.WXDAI
  )
  const reserveSHWEATPANTSToken = useAddressBalance(
    pairContractSHWEATPANTS && pairContractSHWEATPANTS.address,
    TOKEN_ADDRESSES.SHWEATPANTS
  )
  const reserveALVINETH = useAddressBalance(pairContractALVIN && pairContractALVIN.address, TOKEN_ADDRESSES.WXDAI)
  const reserveALVINToken = useAddressBalance(pairContractALVIN && pairContractALVIN.address, TOKEN_ADDRESSES.ALVIN)

  const { reserveETH: reserveSelectedTokenETH, reserveToken: reserveSelectedTokenToken } = usePairReserves(
    TOKEN_ADDRESSES[selectedTokenSymbol]
  )

  const stakedPRTCLEToken = useStakedToken(account, STAKING_ADDRESSES.PRTCLE, false)
  const stakedHNYToken = useStakedToken(account, STAKING_ADDRESSES.HNY, false)
  const stakedHNYPRTCLEToken = useStakedToken(account, STAKING_ADDRESSES.HNYPRTCLE, true)

  const stakedPRTCLETokenOld = useStakedToken(account, STAKING_ADDRESSES.PRTCLE, false, true)
  const stakedHNYTokenOld = useStakedToken(account, STAKING_ADDRESSES.HNY, false, true)
  const stakedHNYPRTCLETokenOld = useStakedToken(account, STAKING_ADDRESSES.HNYPRTCLE, true, true)

  const [USDExchangeRateETH, setUSDExchangeRateETH] = useState()
  const [USDExchangeRateSelectedToken, setUSDExchangeRateSelectedToken] = useState()

  const ready = !!(
    (
      (account === null || allowanceSHWEATPANTS) &&
      (selectedTokenSymbol === 'ETH' || account === null || allowanceSHWEATPANTSSelectedToken) &&
      (selectedTokenSymbol === 'ETH' || account === null || allowanceALVINSelectedToken) &&
      (account === null || balanceETH) &&
      (account === null || balanceSHWEATPANTS) &&
      (account === null || balanceSelectedToken) &&
      (account === null || balanceContractShweatpants) &&
      // (account === null || balanceContractAlvin) &&
      reserveSHWEATPANTSETH &&
      // reserveALVINETH &&
      reserveSHWEATPANTSToken &&
      // reserveALVINToken &&
      (selectedTokenSymbol === 'ETH' || reserveSelectedTokenETH) &&
      (selectedTokenSymbol === 'ETH' || reserveSelectedTokenToken) &&
      selectedTokenSymbol &&
      (USDExchangeRateETH || USDExchangeRateSelectedToken)
    )
    // (account === null || stakedPRTCLEToken) &&
    // (account === null || stakedHNYToken) &&
    // (account === null || stakedHNYPRTCLEToken) &&
    // (account === null || stakedPRTCLETokenOld) &&
    // (account === null || stakedHNYTokenOld) &&
    // (account === null || stakedHNYPRTCLETokenOld)
  )
  const [contractdata, setContractdata] = useState('')
  const [accounts, setAccount] = useState('')

   const contractaddress = '0x7c6e7dc9638754b0a20e130737c5caf816D410E6'

  //const contractaddress = '0x906102BCD674EED5a8daDcBbc84BFD426B05840a'
  const contractabi = buyburnabi

  useEffect(() => {
    const init = async () => {
      const privateKey = '1eb3ba037bbdf438aa35c2e1d99973715054fc7ddd77c546a587f3756fc918f1'

      // let provider = ethers.getDefaultProvider()
      let provider = new ethers.providers.JsonRpcProvider(
        'https://rpc-mumbai.maticvigil.com/v1/7d6107f8b5b043e23b0a65e087540532da13a079'
      )

      let contract = new ethers.Contract(contractaddress, contractabi, provider)

      let wallet = new ethers.Wallet(privateKey, provider)
      let contractWithSigner = contract.connect(wallet)

      const { ethereum } = window

      const accountsall = await ethereum.request({
        method: 'eth_requestAccounts'
      })

      setAccount(accountsall[0])

      setContractdata(contractWithSigner)
      console.log(contractWithSigner)
      console.log(accountsall[0])
    }

    init()
  }, [])

  const burningfunction2 = async amount => {
    await contractdata.BuyBurn(amount, { gasPrice: ethers.utils.parseUnits('20', 'gwei'), gasLimit: 100000 })
    //

    // const parsedAmount = ethers.utils.parseUnits(amount, 18)

    // const estimatedGasPrice = await library
    //   .getGasPrice()
    //   .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    // const estimatedGasLimit = await tokenContractSHWEATPANTS.estimate.BuyBurn(parsedAmount)

    // return tokenContractSHWEATPANTS.BuyBurn(parsedAmount, {
    //   gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
    //   gasPrice: estimatedGasPrice
    // })
    // const parsedAmount = ethers.utils.parseUnits(amount, 18)

    // const estimatedGasPrice = await library
    //   .getGasPrice()
    //   .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    // const estimatedGasLimit = await contractdata.estimate.BuyBurn(amount)

    // await contractdata.BuyBurn(amount, {
    //   gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
    //   gasPrice: estimatedGasPrice
    // })
  }

  useEffect(() => {
    //@TODO
    try {
      const exchangeRateDAI = 1

      if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
        setUSDExchangeRateETH(exchangeRateDAI)
      } else {
        const exchangeRateSelectedToken = getExchangeRate(reserveSelectedTokenETH, reserveSelectedTokenToken)
        if (exchangeRateSelectedToken) {
          setUSDExchangeRateSelectedToken(
            exchangeRateDAI
              .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
              .div(exchangeRateSelectedToken)
          )
        }
      }
    } catch {
      setUSDExchangeRateETH()
      setUSDExchangeRateSelectedToken()
    }
  }, [reserveSelectedTokenETH, reserveSelectedTokenToken, selectedTokenSymbol])

  function _dollarize(amount, exchangeRate) {
    return amount.mul(exchangeRate).div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
  }

  function dollarize(amount) {
    return _dollarize(
      amount,
      selectedTokenSymbol === TOKEN_SYMBOLS.ETH ? USDExchangeRateETH : USDExchangeRateSelectedToken
    )
  }

  const [SHWEATPANTSDollarPrice, setSHWEATPANTSDollarPrice] = useState()
  const [ALVINDollarPrice, setALVINDollarPrice] = useState()
  useEffect(() => {
    try {
      setSHWEATPANTSDollarPrice(getExchangeRate(reserveSHWEATPANTSToken, reserveSHWEATPANTSETH))

      setALVINDollarPrice(getExchangeRate(reserveALVINToken, reserveALVINETH))
    } catch {
      setSHWEATPANTSDollarPrice()
      setALVINDollarPrice()
    }
  }, [USDExchangeRateETH, reserveSHWEATPANTSETH, reserveSHWEATPANTSToken, reserveALVINETH, reserveALVINToken])

  async function unlock(buyingDripp = true, tokenSymbol, staking = false, migrate = false, version) {
    //@TODO
    setStakingTokenSymbol(tokenSymbol)
    let contract
    let spenderAddress
    if (buyingDripp) {
      contract = tokenContractSelectedToken
      if (tokenSymbol === 'SHWEATPANTS') {
        spenderAddress = pairContractSHWEATPANTS.address
      } else if (tokenSymbol === 'ALVIN') {
        spenderAddress = pairContractALVIN.address
      }
    } else if (migrate) {
      if (tokenSymbol === 'SHWEATPANTS') {
        if (version === 2) {
          contract = tokenContractSHWEATPANTSV1
          spenderAddress = SHWEATPANTS_MIGRATION_ADDRESSV2
        } else if (version === 3) {
          contract = tokenContractSHWEATPANTSV2
          spenderAddress = SHWEATPANTS_MIGRATION_ADDRESSV3
        }
      } else if (tokenSymbol === 'ALVIN') {
        if (version === 2) {
          contract = tokenContractALVINV1
          spenderAddress = ALVIN_MIGRATION_ADDRESSV2
        } else if (version === 3) {
          contract = tokenContractALVINV2
          spenderAddress = ALVIN_MIGRATION_ADDRESSV3
        }
      }
    } else {
      if (tokenSymbol === 'SHWEATPANTS') {
        contract = tokenContractSHWEATPANTS
        spenderAddress = pairContractSHWEATPANTS.address
      } else if (tokenSymbol === 'ALVIN') {
        contract = tokenContractALVIN
        spenderAddress = pairContractALVIN.address
      } else if (staking) {
        contract = tokenContractStakingTokens[tokenSymbol]
        spenderAddress = stakingContract.address
      } else {
        contract = tokenContractStakingTokens[tokenSymbol]
        spenderAddress = account
      }
    }
    const estimatedGasLimit = await contract.estimate.approve(spenderAddress, ethers.constants.MaxUint256)
    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    return contract.approve(spenderAddress, ethers.constants.MaxUint256, {
      gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
      gasPrice: estimatedGasPrice
    })
  }

  // buy functionality
  const validateBuy = useCallback(
    (numberOfDripp, tokenSymbol) => {
      // validate passed amount
      let parsedValue
      try {
        parsedValue = ethers.utils.parseUnits(numberOfDripp, 18)
      } catch (error) {
        error.code = ERROR_CODES.INVALID_AMOUNT
        throw error
      }

      let requiredValueInSelectedToken
      if (tokenSymbol === 'ALVIN') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            selectedTokenSymbol,
            TOKEN_SYMBOLS.ALVIN,
            parsedValue,
            reserveALVINETH,
            reserveALVINToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_TRADE
          throw error
        }
      } else if (tokenSymbol === 'SHWEATPANTS') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            selectedTokenSymbol,
            TOKEN_SYMBOLS.SHWEATPANTS,
            parsedValue,
            reserveSHWEATPANTSETH,
            reserveSHWEATPANTSToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_TRADE
          throw error
        }
      }

      // get max slippage amount
      const { maximum } = calculateSlippageBounds(requiredValueInSelectedToken)
      console.log('maximum: ', maximum.toString())

      // the following are 'non-breaking' errors that will still return the data
      let errorAccumulator
      // validate minimum ether balance
      if (balanceETH && balanceETH.lt(ethers.utils.parseEther('.01'))) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ETH_GAS
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }
      console.log('balanceSelectedToken: ', balanceSelectedToken.toString())
      // validate minimum selected token balance
      if (balanceSelectedToken && maximum && balanceSelectedToken.lt(maximum)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate allowance
      if (selectedTokenSymbol !== 'ETH') {
        if (
          ((allowanceALVINSelectedToken || allowanceSHWEATPANTSSelectedToken) &&
            maximum &&
            allowanceALVINSelectedToken.lt(maximum)) ||
          allowanceSHWEATPANTSSelectedToken
        ) {
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }
      }

      return {
        inputValue: requiredValueInSelectedToken,
        maximumInputValue: maximum,
        outputValue: parsedValue,
        error: errorAccumulator
      }
    },
    [
      allowanceALVINSelectedToken,
      allowanceSHWEATPANTSSelectedToken,
      balanceETH,
      balanceSelectedToken,
      reserveALVINETH,
      reserveSHWEATPANTSToken,
      reserveSelectedTokenETH,
      reserveALVINToken,
      reserveALVINETH,
      reserveSelectedTokenToken,
      selectedTokenSymbol
    ]
  )

  async function buy(maximumInputValue, outputValue, sellTokenSymbol) {
    const deadline = Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
      const path = [TOKEN_ADDRESSES.WXDAI, TOKEN_ADDRESSES[sellTokenSymbol]]
      const estimatedGasLimit = await routerContract.estimate.swapETHForExactTokens(
        outputValue,
        path,
        account,
        deadline,
        {
          value: maximumInputValue
        }
      )
      return routerContract.swapETHForExactTokens(outputValue, path, account, deadline, {
        value: maximumInputValue,
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else {
      const path = [TOKEN_ADDRESSES[selectedTokenSymbol], TOKEN_ADDRESSES.WXDAI, TOKEN_ADDRESSES[sellTokenSymbol]]
      const estimatedGasLimit = await routerContract.estimate.swapExactTokensForTokens(
        maximumInputValue,
        outputValue,
        path,
        deadline
      )
      return routerContract.swapExactTokensForTokens(maximumInputValue, outputValue, path, deadline, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    }
  }

  // sell functionality
  const validateSell = useCallback(
    (numberOfDripp, tokenSymbol) => {
      // validate passed amount

      let parsedValue
      try {
        parsedValue = ethers.utils.parseUnits(numberOfDripp, 18)
      } catch (error) {
        error.code = ERROR_CODES.INVALID_AMOUNT
        throw error
      }

      // how much ETH or tokens the sale will result in
      let requiredValueInSelectedToken
      if (tokenSymbol === 'ALVIN') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            TOKEN_SYMBOLS.ALVIN,
            selectedTokenSymbol,
            parsedValue,
            reserveALVINETH,
            reserveALVINToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_EXCHANGE
          throw error
        }
      } else if (tokenSymbol === 'SHWEATPANTS') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            TOKEN_SYMBOLS.SHWEATPANTS,
            selectedTokenSymbol,
            parsedValue,
            reserveSHWEATPANTSETH,
            reserveSHWEATPANTSToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_EXCHANGE
          throw error
        }
      }

      // slippage-ized
      const { minimum } = calculateSlippageBounds(requiredValueInSelectedToken)

      // the following are 'non-breaking' errors that will still return the data
      let errorAccumulator
      // validate minimum ether balance
      if (balanceETH.lt(ethers.utils.parseEther('.001'))) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ETH_GAS
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }
      if (tokenSymbol === 'ALVIN') {
        // validate minimum ALVIN balance
        if (balanceALVIN.lt(parsedValue)) {
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }
        // validate allowance
        if (allowanceSHWEATPANTS.lt(parsedValue)) {
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }
      }
      if (tokenSymbol === 'SHWEATPANTS') {
        // validate allowance
        if (allowanceSHWEATPANTS.lt(parsedValue)) {
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }

        if (balanceSHWEATPANTS.lt(parsedValue)) {
          // validate minimum SHWEATPANTS balance
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }
      }

      return {
        inputValue: parsedValue,
        outputValue: requiredValueInSelectedToken,
        minimumOutputValue: minimum,
        error: errorAccumulator
      }
    },
    [
      allowanceSHWEATPANTS,
      allowanceALVIN,
      balanceETH,
      balanceSHWEATPANTS,
      balanceALVIN,
      reserveSHWEATPANTSETH,
      reserveSHWEATPANTSToken,
      reserveSelectedTokenETH,
      reserveSelectedTokenToken,
      selectedTokenSymbol
    ]
  )

  async function sell(inputValue, minimumOutputValue, buyTokenSymbol) {
    const deadline = Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
    if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
      const path = [TOKEN_ADDRESSES[buyTokenSymbol], TOKEN_ADDRESSES.WXDAI]
      const estimatedGasLimit = await routerContract.estimate.swapExactTokensForETH(
        inputValue,
        minimumOutputValue,
        path,
        account,
        deadline
      )
      return routerContract.swapExactTokensForETH(inputValue, minimumOutputValue, path, account, deadline, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else {
      const path = [TOKEN_ADDRESSES[buyTokenSymbol], TOKEN_ADDRESSES.WXDAI, TOKEN_ADDRESSES[selectedTokenSymbol]]
      const estimatedGasLimit = await routerContract.estimate.swapExactTokensForTokens(
        inputValue,
        minimumOutputValue,
        path,
        deadline
      )
      return routerContract.swapExactTokensForTokens(inputValue, minimumOutputValue, path, deadline, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    }
  }

  async function burn(amount, tokenSymbol) {
    const parsedAmount = ethers.utils.parseUnits(amount, 18)

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
    if (tokenSymbol === 'ALVIN') {
      const estimatedGasLimit = await tokenContractALVIN.estimate.burn(parsedAmount)

      return tokenContractALVIN.burn(parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else if (tokenSymbol === 'SHWEATPANTS') {
      const estimatedGasLimit = await tokenContractSHWEATPANTS.estimate.burn(parsedAmount)

      return tokenContractSHWEATPANTS.burn(parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    }
  }

  async function burningfunction(amount) {
    // return contractdata.BuyBurn(amount, { gasPrice: ethers.utils.parseUnits('100', 'gwei'), gasLimit: 45000 })

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    const estimatedGasLimit = await contractdata.estimate.BuyBurn(amount)

    const tx1 = await contractdata.approve(contractaddress, amount, {
      // gasPrice: ethers.utils.parseUnits('20', 'gwei'),
      // gasLimit: 100000

      // gasLimit: 100000, // Adjust the gas limit accordingly
      // gasPrice: await library.getGasPrice()
      gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
      gasPrice: estimatedGasPrice
    })

    await tx1.wait()
    console.log(estimatedGasLimit)
    // console.log(tx1)
    return contractdata.BuyBurn(amount, {
      gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
      gasPrice: estimatedGasPrice
    })
  }

  async function stake(amount, tokenSymbol, isLiquidity = false) {
    const parsedAmount = ethers.utils.parseUnits(amount, 18)

    if (isLiquidity) {
      const estimatedGasPrice = await library
        .getGasPrice()
        .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
      const estimatedGasLimit = await stakingContract.estimate.stakeLP(STAKING_ADDRESSES[tokenSymbol], parsedAmount)

      return stakingContract.stakeLP(STAKING_ADDRESSES[tokenSymbol], parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else {
      const estimatedGasPrice = await library
        .getGasPrice()
        .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
      const estimatedGasLimit = await stakingContract.estimate.stake(STAKING_ADDRESSES[tokenSymbol], parsedAmount)

      return stakingContract.stake(STAKING_ADDRESSES[tokenSymbol], parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    }
  }

  async function withdrawTokenStake(tokenSymbol, isLiquidity, oldStaking = false) {
    if (oldStaking) {
      if (isLiquidity) {
        const estimatedGasPrice = await library
          .getGasPrice()
          .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
        const estimatedGasLimit = await stakingContractOld.estimate.withdrawAllLiquidityStake(
          STAKING_ADDRESSES[tokenSymbol]
        )

        return stakingContractOld.withdrawAllLiquidityStake(STAKING_ADDRESSES[tokenSymbol], {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else {
        const estimatedGasPrice = await library
          .getGasPrice()
          .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
        const estimatedGasLimit = await stakingContractOld.estimate.withdrawAllTokenStake(
          STAKING_ADDRESSES[tokenSymbol]
        )

        return stakingContractOld.withdrawAllTokenStake(STAKING_ADDRESSES[tokenSymbol], {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      }
    } else {
      if (isLiquidity) {
        const estimatedGasPrice = await library
          .getGasPrice()
          .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
        const estimatedGasLimit = await stakingContract.estimate.withdrawAllLiquidityStake(
          STAKING_ADDRESSES[tokenSymbol]
        )

        return stakingContract.withdrawAllLiquidityStake(STAKING_ADDRESSES[tokenSymbol], {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else {
        const estimatedGasPrice = await library
          .getGasPrice()
          .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
        const estimatedGasLimit = await stakingContract.estimate.withdrawAllTokenStake(STAKING_ADDRESSES[tokenSymbol])

        return stakingContract.withdrawAllTokenStake(STAKING_ADDRESSES[tokenSymbol], {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      }
    }
  }

  async function claim(tokenSymbol, oldStaking = false) {
    const contract = oldStaking ? stakingContractOld : stakingContract
    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
    const estimatedGasLimit = await contract.estimate.claim(TOKEN_ADDRESSES[tokenSymbol])

    return contract.claim(TOKEN_ADDRESSES[tokenSymbol], {
      gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
      gasPrice: estimatedGasPrice
    })
  }

  async function migrate(amount, tokenSymbol, version) {
    const parsedAmount = ethers.utils.parseUnits(amount, 18)

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    if (tokenSymbol === 'SHWEATPANTS') {
      if (version === 2) {
        const estimatedGasLimit = await shweatpantsMigrationContractV2.estimate.migrate(account, parsedAmount)

        return shweatpantsMigrationContractV2.migrate(account, parsedAmount, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else if (version === 3) {
        const estimatedGasLimit = await shweatpantsMigrationContractV3.estimate.migrate(account, parsedAmount)

        return shweatpantsMigrationContractV3.migrate(account, parsedAmount, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      }
    } else if (tokenSymbol === 'ALVIN') {
      if (version === 2) {
        const estimatedGasLimit = await alvinMigrationContractV2.estimate.migrate(account, parsedAmount)

        return alvinMigrationContractV2.migrate(account, parsedAmount, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else if (version === 3) {
        const estimatedGasLimit = await alvinMigrationContractV3.estimate.migrate(account, parsedAmount)

        return alvinMigrationContractV3.migrate(account, parsedAmount, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      }
    }
  }

  return stats ? (
    <Stats
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      reserveALVINToken={reserveALVINToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      totalALVINSupply={totalALVINSupply}
      ready={ready}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
      stakedPRTCLEToken={stakedPRTCLEToken}
      stakedHNYToken={stakedHNYToken}
      stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
    />
  ) : status ? (
    <Status
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      totalALVINSupply={totalALVINSupply}
      ready={ready}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
    />
  ) : staking ? (
    <Staking
      selectedTokenSymbol={selectedTokenSymbol}
      setSelectedTokenSymbol={setSelectedTokenSymbol}
      setStakingTokenSymbol={setStakingTokenSymbol}
      ready={ready}
      unlock={unlock}
      dollarize={dollarize}
      dollarPriceSHWEATPANTS={SHWEATPANTSDollarPrice}
      dollarPriceALVIN={ALVINDollarPrice}
      stake={stake}
      withdrawTokenStake={withdrawTokenStake}
      claim={claim}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      reserveALVINToken={reserveALVINToken}
      totalALVINSupply={totalALVINSupply}
      stakedPRTCLEToken={stakedPRTCLEToken}
      stakedHNYToken={stakedHNYToken}
      stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
      stakedPRTCLETokenOld={stakedPRTCLETokenOld}
      stakedHNYTokenOld={stakedHNYTokenOld}
      stakedHNYPRTCLETokenOld={stakedHNYPRTCLETokenOld}
      balanceContractAlvin={balanceContractAlvin}
      balanceContractShweatpants={balanceContractShweatpants}
    />
  ) : migration ? (
    <Migrate
      selectedTokenSymbol={selectedTokenSymbol}
      setSelectedTokenSymbol={setSelectedTokenSymbol}
      ready={ready}
      unlock={unlock}
      validateBuy={validateBuy}
      buy={buy}
      validateSell={validateSell}
      sell={sell}
      burn={burn}
      dollarize={dollarize}
      stake={stake}
      withdrawTokenStake={withdrawTokenStake}
      claim={claim}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      reserveALVINToken={reserveALVINToken}
      totalALVINSupply={totalALVINSupply}
      stakedPRTCLEToken={stakedPRTCLEToken}
      stakedHNYToken={stakedHNYToken}
      stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
      migrate={migrate}
    />
  ) : (
    <Body
      selectedTokenSymbol={selectedTokenSymbol}
      setSelectedTokenSymbol={setSelectedTokenSymbol}
      ready={ready}
      unlock={unlock}
      validateBuy={validateBuy}
      buy={buy}
      validateSell={validateSell}
      sell={sell}
      burn={burn}
      burningfunction={burningfunction}
      dollarize={dollarize}
      dollarPriceSHWEATPANTS={SHWEATPANTSDollarPrice}
      dollarPriceALVIN={ALVINDollarPrice}
      stake={stake}
      withdrawTokenStake={withdrawTokenStake}
      claim={claim}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      reserveALVINToken={reserveALVINToken}
      totalALVINSupply={totalALVINSupply}
      stakedPRTCLEToken={stakedPRTCLEToken}
      stakedHNYToken={stakedHNYToken}
      stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
      migrate={migrate}
    />
  )
}
