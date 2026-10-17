/* Conservative white-margin trimming. Original pixels and aspect ratio are preserved.
 * Cross-origin sources that disallow canvas access retain the full original image. */
(() => {
  'use strict';
  const cache = new Map();
  function trim(image) {
    const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left=canvas.width, right=-1, top=canvas.height, bottom=-1;
    for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
      const i=(y*canvas.width+x)*4;
      // Keep even light markings, measurement arrows and shadows.
      if(data[i+3]>16 && Math.min(data[i],data[i+1],data[i+2])<246) {
        left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
    }
    if(right<left || bottom<top) return image.src;
    const padding=Math.ceil(Math.max(right-left+1,bottom-top+1)*.05);
    left=Math.max(0,left-padding);right=Math.min(canvas.width-1,right+padding);
    top=Math.max(0,top-padding);bottom=Math.min(canvas.height-1,bottom+padding);
    const width=right-left+1,height=bottom-top+1;
    if(width*height>canvas.width*canvas.height*.88 || width<20 || height<20) return image.src;
    const out=document.createElement('canvas');
    const outputScale=Math.min(1,1000/Math.max(width/scale,height/scale));
    out.width=Math.round(width/scale*outputScale);out.height=Math.round(height/scale*outputScale);
    out.getContext('2d').drawImage(image,left/scale,top/scale,width/scale,height/scale,0,0,out.width,out.height);
    return out.toDataURL('image/webp',.92);
  }
  window.PhotoFrame = {
    sources(source) {
      try{
        const url=new URL(source);let id='';
        if(url.hostname==='drive.google.com')id=url.searchParams.get('id')||(url.pathname.match(/^\/file\/d\/([^/]+)/)||[])[1]||'';
        if(url.hostname==='lh3.googleusercontent.com')id=(url.pathname.match(/^\/d\/([^/=]+)/)||[])[1]||'';
        if(/^[a-zA-Z0-9_-]+$/.test(id)){
          const encoded=encodeURIComponent(id);
          // All URLs point to the SAME uploaded file, never a similar model.
          return [...new Set([`https://lh3.googleusercontent.com/d/${encoded}=w1000`,`https://drive.google.com/thumbnail?id=${encoded}&sz=w1000`,source])];
        }
      }catch{}
      return source?[source]:[];
    },
    enhance(img) {
      if(!img.getAttribute('src'))return;
      // Start only once the lazy-loaded visible image has arrived.
      img.addEventListener('load',async()=>{
        if(img.dataset.framed)return;
        img.dataset.framed='true';
        const source=img.currentSrc||img.src;
        if(!cache.has(source)) cache.set(source,new Promise(resolve=>{
          const probe=new Image();probe.crossOrigin='anonymous';
          probe.onload=()=>{try{resolve(trim(probe))}catch{resolve(source)}};
          probe.onerror=()=>resolve(source);probe.src=source;
        }));
        const framed=await cache.get(source);
        if(img.isConnected && framed!==source)img.src=framed;
      },{once:true});
    }
  };
})();
