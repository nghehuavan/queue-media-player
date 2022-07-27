/*
MIT License
Copyright © 2022, Nghe <nghe.huavan@gmail.com> (https://github.com/nghehuavan)
Free for easylife
*/

class QueueMediaPlayer {
  constructor(videoSelector) {
    this.queue = [];
    this.onQueueShift = null;

    this.queueWaiting = false;
    this.networkWaiting = false;

    this.fetching = false;
    this.fetchingRetryInterval = null;
    this.waitFecthingInterval = null;

    this.timeRanges = [];
    this.lastOffset = 0;

    this.totalBufferDuration = 0;

    this.video = document.querySelector(videoSelector);
    this.mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    this.mediaSource = null;
    this.sourceBuffer = null;

    this.config = {
      nextOnRemaining: 10,
    };
  }

  inittialMediaSource = () => {
    return new Promise((resolveWith) => {
      this.mediaSource = new MediaSource();
      this.video.src = URL.createObjectURL(this.mediaSource);
      this.video.playbackRate = 1.0;
      this.mediaSource.addEventListener('sourceopen', () => {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeCodec);
        this.sourceBuffer.mode = 'segments';
        resolveWith(true);
      });
    });
  };

  addQueue = async (arr) => {
    this.queue.push(...arr);
    if (this.queueWaiting) {
      await this.queueShiftFecthAppendBuffer();
    }
  };

  play = async () => {
    await this.inittialMediaSource();
    this.inittialVideoEventListener();

    if (this.queue.length > 0) {
      // append first video for start
      await this.queueShiftFecthAppendBuffer({ isFirst: true });
      // play video;
      this.video.play();
    }
  };

  inittialVideoEventListener = () => {
    // listen video playing time and get next video when remaining < 10s
    this.video.ontimeupdate = async (e) => {
      if (this.fetching) return;
      this.fetching = true;

      const remaining = Math.abs(this.totalBufferDuration - this.video.currentTime);
      if (remaining <= this.config.nextOnRemaining) {
        await this.queueShiftFecthAppendBuffer();
      }
      this.fetching = false;
    };

    this.video.onwaiting = async (e) => {
      if (this.video?.buffered?.length ?? 0 == 0) return;

      console.log('this.video.onwaiting at ' + this.video.currentTime + ' / ' + this.totalBufferDuration);

      if (this.queueWaiting || this.networkWaiting) return;

      const index = this.timeRanges.findIndex((i) => i.from <= this.video.currentTime && i.to >= this.video.currentTime);
      if (index >= 0) {
        this.seekBackTimeRanges(index);
      }
    };
  };

  seekBackTimeRanges = async (index) => {
    this.video.pause();
    await this.waitForPendingFetching();
    const timeRange = this.timeRanges[index];

    // Rebuild queue from index
    const reBuildQueue = this.timeRanges.filter((_, idx) => idx >= index).map((i) => i.url);
    this.queue.unshift(...reBuildQueue);

    // re-calulate totalBufferDuration by index
    const reBufferDuration = this.timeRanges
      .filter((_, idx) => idx < index)
      .map((i) => i.duration)
      .reduce((prev, curr) => prev + curr, 0);
    this.totalBufferDuration = reBufferDuration;    
    this.lastOffset = timeRange.offset - timeRange.duration;
    await this.queueShiftFecthAppendBuffer({ isFirst: index == 0 });
    this.video.play();
  };

  waitForPendingFetching = () => {
    return new Promise(async (resolveWith) => {
      this.waitFecthingInterval = setInterval(async () => {
        clearInterval(this.waitFecthingInterval);
        if (this.fetching) {
          resolveWith(this.waitForPendingFetching());
        } else {
          resolveWith(true);
        }
      }, 1000);
    });
  };

  queueShiftFecthAppendBuffer = async (isFirst = false) => {
    if (this.queue.length > 0) {
      const url = this.queue.shift();
      const videoFecth = await this.fecthVideo(url);
      this.lastOffset += isFirst ? 0 : videoFecth.duration;
      this.sourceBuffer.timestampOffset = this.lastOffset;
      this.sourceBuffer.appendBuffer(videoFecth.buffer);
      this.totalBufferDuration += videoFecth.duration;
      this.queueWaiting = this.queue.length == 0;

      this.timeRanges.push({
        url: url,
        from: this.lastOffset,
        to: this.lastOffset + videoFecth.duration,
        offset: this.lastOffset,
        duration: videoFecth.duration,
      });

      // callback event
      if (this.onQueueShift) this.onQueueShift(this.queue);
    }
  };

  fecthVideo = async (vidUrl) => {
    const blob = await (await this.fecthForever(vidUrl)).blob();
    const duration = await this.getVideoDuration(blob);
    const buffer = await blob.arrayBuffer();
    return {
      duration,
      buffer,
    };
  };

  // fecth and wait for network error forever
  fecthForever = async (vidUrl) => {
    return new Promise(async (resolveWith) => {
      try {
        const resp = await fetch(vidUrl);
        this.networkWaiting = false;
        resolveWith(resp);
      } catch (error) {
        console.log('There was a network error.');
        this.networkWaiting = true;
        this.fetchingRetryInterval = setInterval(async () => {
          clearInterval(this.fetchingRetryInterval);
          const resp = await this.fecthForever(vidUrl);
          resolveWith(resp);
        }, 5000);
      }
    });
  };

  getVideoDuration = (blob) => {
    return new Promise((resolveWith) => {
      const tempVidElem = document.createElement('video');
      tempVidElem.onloadedmetadata = () => {
        resolveWith(tempVidElem.duration);
      };
      if (tempVidElem.src) URL.revokeObjectURL(tempVidElem.src);
      tempVidElem.src = URL.createObjectURL(blob);
    });
  };
}
