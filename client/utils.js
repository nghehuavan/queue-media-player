const getDuration = (blob) => {
  return new Promise((resolveWith) => {
    const tempVidElem = document.createElement('video');
    tempVidElem.onloadedmetadata = () => {
      resolveWith(tempVidElem.duration);
    };
    if (tempVidElem.src) URL.revokeObjectURL(tempVidElem.src);
    tempVidElem.src = URL.createObjectURL(blob);
  });
};

const addSourceBufferWhenOpen = (mediaSource, mimeStr, mode = 'segments') => {
  return new Promise((resolveWith, reject) => {
    const getSourceBuffer = () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(mimeStr);
        sourceBuffer.mode = mode;
        console.log('addSourceBufferWhenOpen');
        resolveWith(sourceBuffer);
      } catch (e) {
        reject(e);
      }
    };
    if (mediaSource.readyState === 'open') {
      getSourceBuffer();
    } else {
      mediaSource.addEventListener('sourceopen', getSourceBuffer);
    }
  });
};
