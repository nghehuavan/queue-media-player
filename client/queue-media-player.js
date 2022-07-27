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

    this.timeRanges = [];
    this.totalDuration = 0;

    this.video = document.querySelector(videoSelector);
    this.mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    this.mediaSource = null;
    this.sourceBuffer = null;

    this.config = {
      nextOnRemaining: 10,
    };

    //https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
    this.readyState = {
      HAVE_NOTHING: 0,
      HAVE_METADATA: 1,
      HAVE_CURRENT_DATA: 2, //have data but not have buffer
      HAVE_FUTURE_DATA: 3,
      HAVE_ENOUGH_DATA: 4, //available playback
    };
  }

  inittialMediaSource = () => {
    this.mediaSource = new MediaSource();
    this.video.src = URL.createObjectURL(this.mediaSource);
    this.video.playbackRate = 1.0;
    this.mediaSource.addEventListener('sourceopen', () => {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeCodec);
      this.sourceBuffer.mode = 'segments';
    });
  };

  addQueue = (arr) => {
    this.queue.push(...arr);
    if (this.queueWaiting) {
      this.queueShiftFecthAppendBuffer();
    }
  };

  play = async () => {
    this.inittialMediaSource();
    this.inittialVideoEventListener();

    if (this.queue.length > 0) {
      // append first video for start
      this.queueShiftFecthAppendBuffer({ isFirst: true });
      // play video;
      this.video.play();
    }
  };

  inittialVideoEventListener = () => {
    // listen video playing time and get next video when remaining < 10s
    this.video.ontimeupdate = (e) => {
      const remaining = this.totalDuration - this.video.currentTime;
      if (remaining <= this.config.nextOnRemaining) {
        this.queueShiftFecthAppendBuffer();
      }
    };

    this.video.onplaying = (e) => {
      console.log('this.video.onplaying at ' + this.video.currentTime + ' / ' + this.totalDuration);
      this.queueWaiting = false;
    };

    // wating for next queue or some network slow
    this.video.onwaiting = async (e) => {
      console.log('this.video.onwaiting at ' + this.video.currentTime + ' / ' + this.totalDuration);
      console.log(this.video.readyState);

      this.queueWaiting = this.queue.length == 0;
      // if (this.queueWaiting || this.networkWaiting) return;

      // const rangeIdx = this.timeRanges.findIndex((i) => i.from <= this.video.currentTime && i.to >= this.video.currentTime);
      // if (rangeIdx >= 0) {
      //   console.log(this.timeRanges);
      //   const timeRange = this.timeRanges[rangeIdx];
      //   console.log(rangeIdx, timeRange);

      //   const videoFecth = await this.fecthVideoBuff(timeRange.url);
      //   this.sourceBuffer.timestampOffset = timeRange.offset;
      //   this.sourceBuffer.appendBuffer(videoFecth.buffer);
      // }
    };

    this.video.onseeked = async (e) => {
      console.log(e);
      console.log('this.video.onseeked at ' + this.video.currentTime + ' / ' + this.totalDuration);
      console.log(this.video.readyState);
    };
  };

  queueShiftFecthAppendBuffer = async (isFirst = false) => {
    if (this.queue.length > 0) {
      try {
        const url = this.queue.shift();
        const videoFecth = await this.fecthVideoBuff(url);
        this.sourceBuffer.timestampOffset += isFirst ? 0 : videoFecth.duration;
        const from = this.sourceBuffer?.timestampOffset ?? 0;
        const to = from + videoFecth.duration;
        this.timeRanges.push({ url: url, from: from, to: to, offset: this.sourceBuffer.timestampOffset });
        this.sourceBuffer.appendBuffer(videoFecth.buffer);
        this.totalDuration += videoFecth.duration;

        // callback event
        if (this.onQueueShift) this.onQueueShift(this.queue);
      } catch (exception) {
        if (exception.name == 'NetworkError') {
          console.log('There was a network error.');
          this.networkWaiting = true;
        }
      }
    }
  };

  fecthVideoBuff = async (vidUrl) => {
    const blob = await (await fetch(vidUrl)).blob();
    const duration = await this.videoDurationPromise(blob);
    const buffer = await blob.arrayBuffer();
    return {
      duration,
      buffer,
    };
  };

  videoDurationPromise = (blob) => {
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
