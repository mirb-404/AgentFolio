import React from 'react';

const markLoaded = (img: HTMLImageElement) => { img.dataset.loaded = ''; };

/** <img> that fades in once loaded — cached images show immediately */
const FadeImg: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img
        {...props}
        data-fade
        ref={(el) => { if (el?.complete && el.naturalWidth) markLoaded(el); }}
        onLoad={(e) => { markLoaded(e.currentTarget); props.onLoad?.(e); }}
    />
);

export default FadeImg;
