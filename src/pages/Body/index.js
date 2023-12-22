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
import SHE from '../../components/Gallery/sweatpantsnftmedium.mp4'
import Button from '../../components/Button'
import Migrate from '../../components/Migrate'
import { useAddPantsToMetamask, useAddressAllowance, useAddressBalance } from '../../hooks'

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
    <HeaderFrame balanceSHWEATPANTS={balanceSHWEATPANTS}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <Unicorn>
          <span role="img" aria-label="unicorn">
            👖
          </span>
          Pants
        </Unicorn>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {totalSHWEATPANTSSupply && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Burned>
              <span role="img" aria-label="fire">
                🔥
              </span>{' '}
              {100 - totalSHWEATPANTSSupply} <HideMobile>redeemed</HideMobile>
            </Burned>
          </Link>
        )}
        <Account onClick={() => handleAccount()} balanceSHWEATPANTS={balanceSHWEATPANTS}>
          {account ? (
            balanceSHWEATPANTS > 0 ? (
              <SockCount>{balanceSHWEATPANTS && `${amountFormatter(balanceSHWEATPANTS, 18, 0)}`} PANTS</SockCount>
            ) : (
              <SockCount>{account.slice(0, 6)}...</SockCount>
            )
          ) : (
            <SockCount>Connect Wallet</SockCount>
          )}

          <Status balanceSHWEATPANTS={balanceSHWEATPANTS} ready={ready} account={account} />
        </Account>
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
  dollarPriceALVIN,
  dollarPriceSHWEATPANTS,
  balanceSHWEATPANTS,
  balanceALVIN,
  reserveSHWEATPANTSToken,
  reserveALVINToken,
  totalSHWEATPANTSSupply,
  totalALVINSupply,
  migrate
}) {
  const { account } = useWeb3Context()
  const { addToken } = useAddPantsToMetamask()
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
        // totalALVINSupply={totalALVINSupply}
        ready={ready}
        balanceSHWEATPANTS={balanceSHWEATPANTS}
        // balanceALVIN={balanceALVIN}
        setShowConnect={setShowConnect}
      />
      <div>
        {/* <Flex> */}
        {/* <Content>
            <Card
              totalDrippSupply={totalALVINSupply}
              dollarPrice={dollarPriceALVIN}
              reserveDrippToken={reserveALVINToken}
              imageSrc={agaave}
              name={'Alvin'}
              symbol={'$ALVIN'}
            />{' '}
            <Info>
              <div style={{ marginBottom: '4px' }}>Buy and sell real swag with digital currency.</div>
              <div style={{ marginBottom: '4px' }}>
                Delivered on demand.{' '}
                <a
                  href="/"
                  onClick={e => {
                    e.preventDefault()
                    setState(state => ({ ...state, visible: !state.visible }))
                    setShowWorks(true)
                  }}
                >
                  Learn more
                </a>
              </div>
              {/* <SubInfo>
            An experiment in pricing and user experience by the team at Uniswap.{' '}
            <a
              href="/"
              onClick={e => {
                e.preventDefault()
                setState(state => ({ ...state, visible: !state.visible }))
                setShowWorks(true)
              }}
            >
              How it works.
            </a>
          </SubInfo> */}
        {/* </Info> */}
        {/* <BuyButtons color={'#7ce0d6'} balanceDripp={balanceALVIN} drippSelected={'ALVIN'} />
            <RedeemButton balanceDripp={balanceALVIN} drippSelected={'ALVIN'} />
            {!!account && (
              <Link style={{ textDecoration: 'none' }} to="/status">
                <OrderStatusLink>Check order status?</OrderStatusLink>
              </Link>
            )}
          </Content> */}
        <Content>
          <Card
            totalDrippSupply={totalSHWEATPANTSSupply}
            dollarPrice={dollarPriceSHWEATPANTS}
            reserveDrippToken={reserveSHWEATPANTSToken}
            imageSrc={SHE}
            name={'Pants'}
            symbol={'$PANTS'}
          />{' '}
          <Info>
            <div style={{ marginBottom: '4px' }}>Buy and sell real swag with digital currency.</div>
            <div style={{ marginBottom: '4px' }}>
              Delivered on demand.{' '}
              <a
                href="/"
                onClick={e => {
                  e.preventDefault()
                  setState(state => ({ ...state, visible: !state.visible }))
                  setShowWorks(true)
                }}
              >
                Learn more
              </a>
            </div>
            {/* <SubInfo>
            An experiment in pricing and user experience by the team at Uniswap.{' '}
            <a
              href="/"
              onClick={e => {
                e.preventDefault()
                setState(state => ({ ...state, visible: !state.visible }))
                setShowWorks(true)
              }}
            >
              How it works.
            </a>
          </SubInfo> */}
            <Button
              type="cta"
              text={'Add 👖 to Metamask'}
              onClick={addToken}
              style={{ textAlign: 'center', color: 'black' }}
            />
          </Info>
          <BuyButtons color={'#ff006c'} balanceDripp={balanceSHWEATPANTS} drippSelected={'SHWEATPANTS'} />
          <RedeemButton balanceDripp={balanceSHWEATPANTS} drippSelected={'SHWEATPANTS'} />
          {!!account && (
            <Link style={{ textDecoration: 'none' }} to="/status">
              <OrderStatusLink>Check order status?</OrderStatusLink>
            </Link>
          )}
        </Content>
        {/* // </Flex> */}
        {/* <Link to="/staking" style={{ textDecoration: 'none', width: '100%' }}>
          <StakeButton color={'linear-gradient(107deg,#cbf3ef,#fafae2 49.48%,#ff006c)'} text="Stake" />
        </Link> */}
      </div>

      <a href="https://www.youtube.com/watch?v=1pKSjAWu0m8" style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
        <h3>ALVIN is BACK!</h3>
      </a>

      <Checkout
        selectedTokenSymbol={selectedTokenSymbol}
        setSelectedTokenSymbol={setSelectedTokenSymbol}
        ready={ready}
        unlock={unlock}
        validateBuy={validateBuy}
        buy={buy}
        validateSell={validateSell}
        sell={sell}
        burn={burn}
        balanceDripp={state.drippSelected === 'SHWEATPANTS' ? balanceSHWEATPANTS : balanceALVIN}
        dollarPrice={state.drippSelected === 'SHWEATPANTS' ? dollarPriceSHWEATPANTS : dollarPriceALVIN}
        reserveDrippToken={state.drippSelected === 'SHWEATPANTS' ? reserveSHWEATPANTSToken : reserveALVINToken}
        dollarize={dollarize}
        showConnect={showConnect}
        setShowConnect={setShowConnect}
        currentTransactionHash={currentTransaction.hash}
        currentTransactionType={currentTransaction.type}
        currentTransactionAmount={currentTransaction.amount}
        setCurrentTransaction={setCurrentTransaction}
        clearCurrentTransaction={clearCurrentTransaction}
        showWorks={showWorks}
        setShowWorks={setShowWorks}
        tokenSymbol={state.drippSelected}
      />
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
  scroll-behavior: smooth;
  position: ${props => (props.overlay ? 'fixed' : 'initial')};
  background-color: #fff;
`

const Content = styled.div`
  width: calc(100vw - 32px);
  max-width: 400px;
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
