import React, { VideoHTMLAttributes, useCallback, useState } from 'react'
import { styled } from '@stitches/react';

const FaceCam = styled('video', {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "15px",
    transform: "rotateY(180deg)",
})


type FaceCamProps = VideoHTMLAttributes<HTMLVideoElement> & {
    srcObject: MediaStream | null
}

// The current React Video component doesn't allow for srcObject, so we make a wrapper that taps into the ref
export const FaceCamComponent = ({ srcObject, ...props }: FaceCamProps) => {
    const refVideo = useCallback(
      (node: HTMLVideoElement) => {
        if (node) {
            node.srcObject = srcObject;
            node.onloadedmetadata = () => {
                node.play();
            }
        }
      },
      [srcObject],
    );
  
    return <FaceCam ref={refVideo} {...props} />;
};