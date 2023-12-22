import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useWeb3Context } from 'web3-react'
import { Link } from 'react-router-dom'

import { useAppContext } from '../../context'
import Card from '../../components/Card'
import { amountFormatter, TOKEN_ADDRESSES, STAKING_ADDRESS, STAKING_ADDRESSES } from '../../utils'
import agaave from '../../components/Gallery/agaave.png'
import SHE from '../../components/Gallery/pants.png'
import Input from '../../components/Input'
import StakeButton from '../../components/Button'
import {
  useAddressAllowance,
  useAddressBalance,
  useStakingAllowance,
  useStakingRewards,
  useTotalStaked,
  useDrippRate,
  useOldTotalStaked,
  useOldStakingRewards
} from '../../hooks'
import Button from '../../components/Button'
import { BigNumber } from 'ethers/utils'

export function Header({ stakedPRTCLEToken, stakedHNYToken, ready, balanceSHWEATPANTS, balanceALVIN, setShowConnect }) {
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
          Dripp
        </Unicorn>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {balanceSHWEATPANTS && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Staked>
              <span role="img" aria-label="fire">
                👖
              </span>{' '}
              {amountFormatter(balanceSHWEATPANTS)} <HideMobile>SHWEATPANTS</HideMobile>
            </Staked>
          </Link>
        )}
        {balanceALVIN && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Staked>
              <span role="img" aria-label="fire">
                🧸
              </span>{' '}
              {amountFormatter(balanceALVIN)} <HideMobile>ALVIN</HideMobile>
            </Staked>
          </Link>
        )}
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

const Staked = styled.div`
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

export default function Staking({
  setStakingSymbols,
  ready,
  unlock,
  stake,
  claim,
  withdrawTokenStake,
  withdrawLPStake,
  dollarize,
  dollarPriceSHWEATPANTS,
  dollarPriceALVIN,
  balanceSHWEATPANTS,
  balanceALVIN,
  reserveSHWEATPANTSToken,
  reserveALVINToken,
  totalSHWEATPANTSSupply,
  totalALVINSupply,
  stakedPRTCLEToken,
  stakedHNYToken,
  stakedHNYPRTCLEToken,
  stakedPRTCLETokenOld,
  stakedHNYTokenOld,
  stakedHNYPRTCLETokenOld,
  balanceContractAlvin,
  balanceContractShweatpants
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
  const shweatpantsRewards = useStakingRewards(account, TOKEN_ADDRESSES.SHWEATPANTS)
  const alvinRewards = useStakingRewards(account, TOKEN_ADDRESSES.ALVIN)
  const shweatpantsRewardsOld = useOldStakingRewards(account, TOKEN_ADDRESSES.SHWEATPANTS)
  const alvinRewardsOld = useOldStakingRewards(account, TOKEN_ADDRESSES.ALVIN)

  return (
    <AppWrapper overlay={state.visible}>
      <Header
        stakedPRTCLEToken={stakedPRTCLEToken}
        stakedHNYToken={stakedHNYToken}
        stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
        ready={ready}
        balanceSHWEATPANTS={balanceSHWEATPANTS}
        balanceALVIN={balanceALVIN}
        setShowConnect={setShowConnect}
      />
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Flex>
          <Content>
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
            </Info>
            <Button
              style={{
                flex: 1,
                'margin-top': '1rem'
              }}
              disabled={
                !alvinRewards ||
                (alvinRewards && alvinRewards.isZero()) ||
                (balanceContractAlvin && balanceContractAlvin.lt(alvinRewards))
              }
              text={
                balanceContractAlvin && alvinRewards && balanceContractAlvin.lt(alvinRewards)
                  ? 'No more ALVINs in staking contract'
                  : `Claim ${alvinRewards ? amountFormatter(alvinRewards, 18, 10) : 0} ALVIN`
              }
              onClick={() => claim && claim('ALVIN')}
            ></Button>
            {/* {alvinRewardsOld && !alvinRewardsOld.isZero() && (
              <Button
                style={{
                  flex: 1,
                  'margin-top': '1rem'
                }}
                text={`Claim Previous ALVIN`}
                onClick={() => claim && claim('ALVIN', true)}
              ></Button>
            )} */}
          </Content>
          <div style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row' }}>
            <div style={{ flex: '1 1 45%' }}>
              <Input
                title={'HNY'}
                background={'radial-gradient(circle at 50% 100%, #ffc3ab, #fafae2 49.48%, #cbf3ef )'}
                balance={useAddressBalance(account, TOKEN_ADDRESSES.HNY)}
                stakedToken={stakedHNYToken}
                stake={stake}
                withdraw={withdrawTokenStake}
                tokenAllowance={useStakingAllowance(account, TOKEN_ADDRESSES.HNY)}
                unlock={unlock}
                tokenSymbol={'HNY'}
                rewardSymbol={'ALVIN'}
                claim={claim}
                rewards={alvinRewards}
                totalStaked={useTotalStaked(TOKEN_ADDRESSES.HNY)}
                rate={useDrippRate(TOKEN_ADDRESSES.ALVIN)}
                oldRewards={alvinRewardsOld}
                oldTotalStaked={useOldTotalStaked(STAKING_ADDRESSES.HNY)}
                oldStaked={stakedHNYTokenOld}
              />
            </div>
            <div style={{ flex: '1 1 45%', marginLeft: '1rem' }}>
              <Input
                title={'PRTCLE'}
                background={'radial-gradient(circle at 50% 150%, #ff4, #e6ffff 49.48%, #ff006c )'}
                balance={useAddressBalance(account, TOKEN_ADDRESSES.PRTCLE)}
                stakedToken={stakedPRTCLEToken}
                stake={stake}
                withdraw={withdrawTokenStake}
                account={account}
                tokenSymbol={'PRTCLE'}
                tokenAllowance={useStakingAllowance(account, TOKEN_ADDRESSES.PRTCLE)}
                unlock={unlock}
                claim={claim}
                rewardSymbol={'SHWEATPANTS'}
                rewards={shweatpantsRewards}
                totalStaked={useTotalStaked(TOKEN_ADDRESSES.PRTCLE)}
                oldStaked={stakedPRTCLETokenOld}
                oldRewards={shweatpantsRewardsOld}
                oldTotalStaked={useOldTotalStaked(STAKING_ADDRESSES.PRTCLE)}
                rate={useDrippRate(TOKEN_ADDRESSES.SHWEATPANTS)}
              />
            </div>
            <div style={{ flex: '1 1 100%' }}>
              <Input
                title={'HNY-PRTCLE'}
                background={'linear-gradient(107deg,#cbf3ef,#fafae2 49.48%,#ff006c)'}
                balance={useAddressBalance(account, STAKING_ADDRESSES.HNYPRTCLE)}
                tokenSymbol={'HNYPRTCLE'}
                stakedToken={stakedHNYPRTCLEToken}
                stake={stake}
                withdraw={withdrawTokenStake}
                tokenAllowance={useStakingAllowance(account, STAKING_ADDRESSES.HNYPRTCLE)}
                unlock={unlock}
                isLiquidity={true}
                oldTotalStaked={useOldTotalStaked(STAKING_ADDRESSES.HNYPRTCLE)}
                oldStaked={stakedHNYPRTCLETokenOld}
                totalStaked={useTotalStaked(STAKING_ADDRESSES.HNYPRTCLE)}
                rate={useDrippRate(TOKEN_ADDRESSES.SHWEATPANTS)}
              />
            </div>
          </div>
          <Content>
            <Card
              totalDrippSupply={totalSHWEATPANTSSupply}
              dollarPrice={dollarPriceSHWEATPANTS}
              reserveDrippToken={reserveSHWEATPANTSToken}
              imageSrc={SHE}
              name={'Shweatpants'}
              symbol={'$SHWEATPANTS'}
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
            </Info>
            <Button
              style={{
                flex: 1,
                'margin-top': '1rem'
              }}
              disabled={
                !shweatpantsRewards ||
                ((shweatpantsRewards && shweatpantsRewards.isZero()) ||
                  (balanceContractShweatpants && balanceContractShweatpants.lt(shweatpantsRewards)))
              }
              text={
                balanceContractShweatpants && shweatpantsRewards && balanceContractShweatpants.lt(shweatpantsRewards)
                  ? 'No more SHWEATPANTS in staking contract'
                  : `Claim ${shweatpantsRewards ? amountFormatter(shweatpantsRewards, 18, 10) : 0} SHWEATPANTS`
              }
              onClick={() => claim && claim('SHWEATPANTS')}
            ></Button>
            {/* {shweatpantsRewardsOld && !shweatpantsRewardsOld.isZero() && (
              <Button
                style={{
                  flex: 1,
                  'margin-top': '1rem'
                }}
                text={`Claim Previous SHWEATPANTS`}
                onClick={() => claim && claim('SHWEATPANTS', true)}
              ></Button>
            )} */}
          </Content>
        </Flex>
      </div>
      <Link to="/" style={{ textDecoration: 'none', cursor: 'pointer', width: '75%', marginTop: '24px' }}>
        <StakeButton text="Back to Buy" style={{ width: '50s%', margin: '0 auto', 'pointer-events': 'none' }} />
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
  margin-top: 32px;
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
  align-items: center;
`
