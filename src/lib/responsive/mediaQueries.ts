export const MEDIA_QUERIES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  // viewportStore.isShortHeight (height < 650px) 및 layoutMode === 'short-height' (height < 600px)와 정밀 일치
  shortHeight: '(max-height: 649px)', 
  // getLayoutMode: width >= 1024 && height >= 500 && height < 650 && ratio >= 1.9 (aspect ratio 19:10)
  lowHeightDesktop: '(min-width: 1024px) and (min-height: 500px) and (max-height: 649px) and (min-aspect-ratio: 19/10)',
  // getLayoutMode: width >= 1024 && width < 1200 && height >= 600 && height < 685 && ratio >= 1.5 (aspect ratio 15:10)
  compactDesktop: '(min-width: 1024px) and (max-width: 1199px) and (min-height: 600px) and (max-height: 684px) and (min-aspect-ratio: 15/10)'
};
