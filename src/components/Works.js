import React from 'react'
import styled from 'styled-components'

import { Controls } from './Redeem'

const WorksFrame = styled.div`
  width: 100%;
  padding: 24px;
  padding-top: 16px;
  box-sizing: border-box;
  font-size: 24px;
  font-weight: 600;
  /* line-height: 170%; */
  /* text-align: center; */
`
const Title = styled.p`
  margin-top: 1rem !important;

  font-weight: 600;
  font-size: 16px;
`

const Desc = styled.p`
  line-height: 150%;
  font-size: 14px;
  margin-top: 1rem !important;
  font-weight: 500;
`

export function link(hash) {
  return `https://blockscout.com/poa/xdai//tx/${hash}`
}

export const EtherscanLink = styled.a`
  text-decoration: none;
  color: ${props => props.theme.shenaniganPink};
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
`

export default function Works({ closeCheckout }) {
  return (
    <WorksFrame>
      <Controls closeCheckout={closeCheckout} theme={'dark'} />

      <Title>How it works:</Title>
      <Desc>
        $Dripp are tokens that entitle you to 1 real pair of limited edition swag from xDai projects, shipped anywhere in the world.
      </Desc>
      <Desc>
        You can sell the tokens back at any time. To get a <i>real</i> pair, redeem a Dripp token
      </Desc>
      <Title>How it's priced:</Title>
      <Desc>
        Dripp tokens are listed starting at predetermined prices of the item. Each buy/sell will move the price. The increase or decrease
        follows a{' '}
        <a
          href="https://blog.relevant.community/bonding-curves-in-depth-intuition-parametrization-d3905a681e0a"
          target="_blank"
          rel="noopener noreferrer"
        >
          bonding curve
        </a>
        . Each Dripp will eventually find an equillibrium based on market demand.
      </Desc>
      <Title>Honeypay:</Title>
      <Desc>
        Buying or selling dripp uses the honeyswap protocol and accepts any token input as a payment method. The pool of
        each Drip is a honeyswap pool where tokens were deposited along with the starting value of xDai.{' '}
      </Desc>
      <Desc>
        <a href="https://honeyswap.org/" target="_blank" rel="noopener noreferrer">
          Learn more about how honeyswap works.
        </a>
      </Desc>
      <Desc>
        <a href="mailto:victor@she.energy" target="_blank" rel="noopener noreferrer">
          Get in touch.
        </a>
      </Desc>
    </WorksFrame>
  )
}
