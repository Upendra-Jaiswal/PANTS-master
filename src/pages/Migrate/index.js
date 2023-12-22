import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useWeb3Context } from 'web3-react'
import { Link } from 'react-router-dom'

import { useAppContext } from '../../context'
import Card from '../../components/Card'
import BuyButtons from '../../components/Buttons'
import RedeemButton from '../../components/RedeemButton'
import StakeButton from '../../components/StakeButton'
import Checkout from '../../components/Checkout'
import {
  ALVIN_MIGRATION_ADDRESSV2,
  ALVIN_MIGRATION_ADDRESSV3,
  amountFormatter,
  SHWEATPANTS_MIGRATION_ADDRESSV2,
  SHWEATPANTS_MIGRATION_ADDRESSV3,
  TOKEN_ADDRESSES
} from '../../utils'
import agaave from '../../components/Gallery/agaave.png'
import SHE from '../../components/Gallery/pants.png'
import Button from '../../components/Button'
import Migrate from '../../components/Migrate'
import { useAddressAllowance, useAddressBalance } from '../../hooks'
import arrow from '../../components/Gallery/chevron-down-arrow-svgrepo-com.svg'

export function Header({
  totalSHWEATPANTSSupply,
  totalALVINSupply,
  ready,
  balanceSHWEATPANTS,
  balanceALVIN,
  setShowConnect
}) {
  const { account, setConnector } = useWeb3Context()

  function handleAccount() {
    setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
      setShowConnect(true)
    })
  }

  return (
    <HeaderFrame balanceSHWEATPANTS={balanceSHWEATPANTS} balanceALVIN={balanceALVIN}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <Unicorn>
          <span>💧</span>
          Dripp by Shenanigan
        </Unicorn>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {/* {totalSHWEATPANTSSupply && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Burned>
              <span role="img" aria-label="fire">
                🤸‍♀️
              </span>{' '}
              {100 - totalSHWEATPANTSSupply} <HideMobile>redeemed</HideMobile>
            </Burned>
          </Link>
        )}
        {totalALVINSupply && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Burned>
              <span role="img" aria-label="fire">
                🐝
              </span>{' '}
              {100 - totalALVINSupply} <HideMobile>redeemed</HideMobile>
            </Burned>
          </Link>
        )} */}
        <Flex style={{ flexDirection: 'column' }}>
          <Account onClick={() => handleAccount()} balanceSHWEATPANTS={balanceSHWEATPANTS} balanceALVIN={balanceALVIN}>
            {account ? <SockCount>{account.slice(0, 6)}...</SockCount> : <SockCount>Connect Wallet</SockCount>}

            <Status
              balanceSHWEATPANTS={balanceSHWEATPANTS}
              balanceALVIN={balanceALVIN}
              ready={ready}
              account={account}
            />
          </Account>
        </Flex>
      </div>
    </HeaderFrame>
  )
}

const HeaderFrame = styled.div`
  width: 100%;
  box-sizing: border-box;
  margin: 0px;
  font-size: 1.25rem;
  color: ${props => (props.balanceSOCKS ? props.theme.primary : 'white')};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 1rem;
`

const Account = styled.div`
  background-color: ${props => (props.balanceSOCKS ? '#f1f2f6' : props.theme.blue)};
  padding: 0.75rem;
  border-radius: 6px;
  cursor: ${props => (props.balanceSOCKS ? 'auto' : 'pointer')};

  transform: scale(1);
  transition: transform 0.3s ease;

  :hover {
    transform: ${props => (props.balanceSOCKS ? 'scale(1)' : 'scale(1.02)')};
    text-decoration: underline;
  }
`

const Burned = styled.div`
  background-color: none;
  border: 1px solid red;
  margin-right: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transform: scale(1);
  transition: transform 0.3s ease;
  line-height: 1;

  :hover {
    transform: scale(1.02);
  }

  font-weight: 500;
  font-size: 14px;
  color: red;
`

const HideMobile = styled.span`
  @media only screen and (max-width: 480px) {
    display: none;
  }
`

const SockCount = styled.p`
  /* color: #6c7284; */
  font-weight: 500;
  margin: 0px;
  font-size: 14px;
  float: left;
`

const Status = styled.div`
  display: ${props => (props.balanceSOCKS ? 'initial' : 'none')};
  width: 12px;
  height: 12px;
  border-radius: 100%;
  margin-left: 12px;
  margin-top: 2px;
  float: right;
  background-color: ${props =>
    props.account === null ? props.theme.orange : props.ready ? props.theme.green : props.theme.orange};
  // props.account === null ? props.theme.orange : props.theme.green};
`

export default function Body({
  selectedTokenSymbol,
  setSelectedTokenSymbol,
  ready,
  unlock,
  validateBuy,
  buy,
  validateSell,
  sell,
  burn,
  dollarize,
  dollarPrice,
  balanceSHWEATPANTS,
  balanceALVIN,
  reserveSHWEATPANTSToken,
  reserveALVINToken,
  totalSHWEATPANTSSupply,
  totalALVINSupply,
  migrate
}) {
  const { account } = useWeb3Context()
  const [currentTransaction, _setCurrentTransaction] = useState({})
  const setCurrentTransaction = useCallback((hash, type, amount) => {
    _setCurrentTransaction({ hash, type, amount })
  }, [])
  const clearCurrentTransaction = useCallback(() => {
    _setCurrentTransaction({})
  }, [])
  const [state, setState] = useAppContext()
  const [showConnect, setShowConnect] = useState(false)
  const [showWorks, setShowWorks] = useState(false)

  return (
    <AppWrapper overlay={state.visible}>
      <Header
        totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
        totalALVINSupply={totalALVINSupply}
        ready={ready}
        dollarPrice={dollarPrice}
        balanceSHWEATPANTS={balanceSHWEATPANTS}
        balanceALVIN={balanceALVIN}
        setShowConnect={setShowConnect}
      />
      <div style={{ textAlign: 'center' }}>
        <h1>Migrate</h1>
      </div>
      <Flex style={{ justifyContent: 'center', alignItems: 'center', width: '85%' }}>
        <Migrate
          title={'Migrate ALVIN V1 to V2'}
          background={'white'}
          unlock={unlock}
          tokenSymbol={'ALVIN'}
          version={2}
          balance={useAddressBalance(account, TOKEN_ADDRESSES.ALVINV1)}
          tokenAllowance={useAddressAllowance(account, TOKEN_ADDRESSES.ALVINV1, ALVIN_MIGRATION_ADDRESSV2)}
          migrate={migrate}
          style={{ flex: '1 1 0px' }}
        ></Migrate>
        <Migrate
          title={'Migrate SHWEATPANTS V1 to V2'}
          background={'white'}
          tokenSymbol={'SHWEATPANTS'}
          version={2}
          tokenAllowance={useAddressAllowance(account, TOKEN_ADDRESSES.SHWEATPANTSV1, SHWEATPANTS_MIGRATION_ADDRESSV2)}
          balance={useAddressBalance(account, TOKEN_ADDRESSES.SHWEATPANTSV1)}
          unlock={unlock}
          migrate={migrate}
          style={{ flex: '1 1 0px' }}
        ></Migrate>
      </Flex>
      <Arrow src={arrow}></Arrow>
      <Flex style={{ justifyContent: 'center', alignItems: 'center', marginTop: '24px', width: '85%' }}>
        <Migrate
          title={'Migrate ALVIN V2 to V3'}
          background={'white'}
          unlock={unlock}
          tokenSymbol={'ALVIN'}
          version={3}
          balance={useAddressBalance(account, TOKEN_ADDRESSES.ALVINV2)}
          tokenAllowance={useAddressAllowance(account, TOKEN_ADDRESSES.ALVINV2, ALVIN_MIGRATION_ADDRESSV3)}
          migrate={migrate}
          style={{ flex: '1 1 0px' }}
        ></Migrate>
        <Migrate
          title={'Migrate SHWEATPANTS V2 to V3'}
          background={'white'}
          tokenSymbol={'SHWEATPANTS'}
          version={3}
          tokenAllowance={useAddressAllowance(account, TOKEN_ADDRESSES.SHWEATPANTSV2, SHWEATPANTS_MIGRATION_ADDRESSV3)}
          balance={useAddressBalance(account, TOKEN_ADDRESSES.SHWEATPANTSV2)}
          unlock={unlock}
          migrate={migrate}
          style={{ flex: '1 1 0px' }}
        ></Migrate>
      </Flex>
      <Link to="/" style={{ textDecoration: 'none', width: '50%', marginTop: '50px' }}>
        <Button
          style={{ pointerEvents: 'none' }}
          color={'linear-gradient(107deg,#cbf3ef,#fafae2 49.48%,#ff006c)'}
          preventDefault={false}
          text="Go Back"
        />
      </Link>
    </AppWrapper>
  )
}

const AppWrapper = styled.div`
  width: 100vw;
  height: 100%;
  margin: 0px auto;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-items: center;
  overflow: ${props => (props.overlay ? 'hidden' : 'scroll')};
  scroll-behavior: smooth;
  position: ${props => (props.overlay ? 'fixed' : 'initial')};
`

const Content = styled.div`
  width: calc(100vw - 32px);
  max-width: 375px;
  margin-top: 8px;
`

const Info = styled.div`
  color: ${props => props.theme.text};
  font-weight: 500;
  margin: 0px;
  font-size: 14px;
  padding: 20px;
  padding-top: 32px;
  border-radius: 0 0 8px 8px;
  /* border-radius: 8px; */
  margin-bottom: 12px;
  margin-top: -12px;
  /* margin-top: 16px; */
  background-color: ${props => '#f1f2f6'};
  a {
    color: ${props => props.theme.shenaniganPink};
    text-decoration: none;
    /* padding-top: 8px; */
    /* font-size: 14px; */
  }
  a:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`

const OrderStatusLink = styled.p`
  color: ${props => props.theme.shenaniganPink};
  text-align: center;
  font-size: 0.6rem;
`

const Unicorn = styled.p`
  color: ${props => props.theme.shenaniganPink};
  font-weight: 600;
  margin: auto 0px;
  font-size: 16px;
`

const Flex = styled.div`
  display: flex;
  gap: 32px;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`
const Arrow = styled.img`
  width: 7%;
`
