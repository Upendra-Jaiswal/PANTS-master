import * as React from 'react'
import styled from 'styled-components'

const GalleryFrame = styled.div`
  width: 100%;
  height: 100%;
  min-height: 258px;
  display: flex;
  align-items: center;
  flex-direction: center;
  object-fit: cover;
  /* background-color: ${props => props.theme.black}; */
  box-shadow: 10px 10px 0px rgba(0, 0, 0, 0.05);
`
const Shadow = styled.div`
  background-color: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 100%;
  position: absolute;
  top:0;
  left:0;
  border-radius: 8px;

`
const ImgStyle = styled.video`
  width: 100%;
  height:100%;
  position: absolute;
  z-index: -1;
  object-fit: cover;  
  top:0;
  left:0;
  border-radius: 8px;

  /* box-sizing: border-box;
  border-radius: 4px; */
  /* background-color: ${props => props.theme.black}; */
`

export default function Gallery(props) {
  return (
    <GalleryFrame>
      <Shadow>
        <ImgStyle src={props.src} autoPlay muted loop salt="Logo" />
      </Shadow>
    </GalleryFrame>
  )
}
