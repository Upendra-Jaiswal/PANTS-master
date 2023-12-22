import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import Tilt from 'react-tilt'

import { amountFormatter } from '../utils'

import Gallery from './Gallery'

export default function Card({ totalDrippSupply, dollarPrice, reserveDrippToken, imageSrc, name, symbol }) {
  return (
    <Tilt
      style={{ background: '#000', borderRadius: '8px' }}
      options={{ scale: 1.01, max: 10, glare: true, 'max-glare': 1, speed: 1000 }}
    >
      <CardWrapper>
        <Header>
          <span>
            <Title>{name}</Title>
            <SubTitle>{symbol}</SubTitle>
          </span>
        </Header>

        <Gallery src={imageSrc} />
        <MarketData>
          <span>
            <CurrentPrice>{dollarPrice ? `$${amountFormatter(dollarPrice, 18, 2)} USD` : '$0.00'}</CurrentPrice>
            {/* <SockCount>
              {reserveDrippToken && totalDrippSupply
                ? `${amountFormatter(reserveDrippToken, 18, 0)}/${totalDrippSupply} available`
                : ''}
            </SockCount> */}
          </span>
          <Link to="/stats">
            <Info>
              <InfoButton>?</InfoButton>
              <Dynamic>Dynamic Pricing Stats</Dynamic>
            </Info>
          </Link>
        </MarketData>
      </CardWrapper>
    </Tilt>
  )
}

const CardWrapper = styled.div`
  /* max-width: 300px; */
  background: #000000;
  background: linear-gradient(162.92deg, #2b2b2b 12.36%, #000000 94.75%);
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  color: white;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  cursor: default;
  z-index: 1;
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1);
`
const Header = styled.div`
  display: flex;
  flex-direction: column;
  /* justify-content: space-between; */
  align-items: flex-start;
  width: 100%;
  margin:0;
  /* margin-top: 1rem; */
  z-index: 1;
`

const Title = styled.p`
  font-weight: 500;
  font-size: 24px;
  line-height: 126.7%;
  width: 100%;
  margin: 0;
  margin-left: 0.5rem;
  margin-top: 1rem;
  z-index: 1;
`

const SubTitle = styled.p`
  color: #6c7284;
  font-family: Inter;
  font-style: normal;
  font-weight: 500;
  font-size: 18px;
  line-height: 156.7%;
  width: 100%;
  margin: 0;
  margin-left: 0.5rem;
  font-feature-settings: 'tnum' on, 'onum' on;
  z-index: 1;
`

const SockCount = styled.p`
  color: #aeaeae;
  font-weight: 400;
  margin: 0px;
  font-size: 12px;
  font-feature-settings: 'tnum' on, 'onum' on;
  z-index: 1;
`

const CurrentPrice = styled.p`
  font-weight: 600;
  font-size: 18px;
  margin: 0px;
  margin-bottom: 0.5rem;
  margin-left: 0.5rem;
  font-feature-settings: 'tnum' on, 'onum' on;
  z-index: 1;
`

const Info = styled.div`
  z-index: 1;
  margin-right: 10px;
  margin-bottom: 0.5rem;
  /* margin-bottom: -2px; */
`

const Dynamic = styled.p`
  color: #ffff;
  font-style: italic;
  font-weight: 400;
  margin: 0px;
  margin-top: 1px;
  margin-right: 10px;
  font-size: 12px;
  float: left;
  z-index: 1;
  margin-bottom: 0.5rem;
`

const InfoButton = styled.span`
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: white;
  text-decoration: none;
  text-align: center;
  border-radius: 50%;
  margin-left: 8px;
  float: right;
  background-color: #5ca2ff;
  z-index: 1;
`

const MarketData = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  /* margin-top: 1 rem; */
  z-index: 1;
`
