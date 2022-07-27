/*
MIT License
Copyright © 2022, Nghe <nghe.huavan@gmail.com> (https://github.com/nghehuavan)
Free for easylife
*/

class QueueMediaPlayer {
  constructor(videoSelector) {
    this.queue = [];
    this.onQueueShift = null;
    this.emptyQueueWaiting = false;

    this.seeks = [];
    this.totalDuration = 0;

    this.video = document.querySelector(videoSelector);
    this.mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    this.mediaSource = null;
    this.sourceBuffer = null;

    this.config = {
      nextOnRemaining: 10,
    };
  }

  inittialMediaSource = () => {
    this.mediaSource = new MediaSource();
    this.video.src = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener('sourceopen', () => {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mimeCodec);
      this.sourceBuffer.mode = 'segments';
    });
  };

  addQueue = (arr) => {
    this.queue.push(...arr);
    if (this.emptyQueueWaiting) {
      this.queueShiftAppendBuffer();
    }
  };

  play = async () => {
    this.inittialMediaSource();
    this.inittialVideoEventListener();

    if (this.queue.length > 0) {
      // append first video for start
      this.queueShiftAppendBuffer({ isFirst: true });
      // play video;
      this.video.play();
    }
  };

  inittialVideoEventListener = () => {
    // listen video playing time and get next video when remaining < 10s
    this.video.ontimeupdate = (e) => {
      const remaining = this.totalDuration - this.video.currentTime;
      if (remaining <= this.config.nextOnRemaining) {
        this.queueShiftAppendBuffer();
      }
      this.emptyQueueWaiting = this.queue.length == 0 && remaining <= 0;
    };

    // wating for next queue or some network slow
    this.video.onwaiting = (e) => {
      console.log('this.video.onwaiting at ' + this.video.currentTime + ' / ' + this.totalDuration);

      this.emptyQueueWaiting = this.totalDuration > 0 && this.queue.length == 0;
    };

    this.video.onplaying = (e) => {
      console.log('this.video.onplaying at ' + this.video.currentTime + ' / ' + this.totalDuration);
      this.emptyQueueWaiting = false;
    };

    this.video.onseeked = (e) => {
      console.log(e);
      console.log('this.video.onseeked at ' + this.video.currentTime + ' / ' + this.totalDuration);
    };
  };

  queueShiftAppendBuffer = async (isFirst = false) => {
    if (this.queue.length > 0) {
      const url = this.queue.shift();
      const videoFecth = await this.fecthVideoBuff(url);

      const fromOffset = this.sourceBuffer?.timestampOffset ?? 0;
      const toOffset = isFirst ? fromOffset : fromOffset + videoFecth.duration;
      this.sourceBuffer.timestampOffset = toOffset;
      this.sourceBuffer.appendBuffer(videoFecth.buffer);

      this.totalDuration += videoFecth.duration;
      this.seeks.push({ url: url, from: fromOffset, to: toOffset });

      // callback event
      if (this.onQueueShift) this.onQueueShift(this.queue);
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
