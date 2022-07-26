/*
MIT License
Copyright © 2022, Nghe <nghe.huavan@gmail.com> (https://github.com/nghehuavan)
Free for easylife
*/

class QueueMediaPlayer {
  constructor(videoSelector) {
    this.config = {
      nextAt: 10,
    };
    this.queue = [];
    this.onQueueShift = null;
    this.queueWaiting = null;
    this.totalDuration = 0;
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.video = document.querySelector(videoSelector);
    this.mimeCodec = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
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

    console.log(this.queueWaiting);
    if (this.queueWaiting) {
      this.appendNextQueue();
    }
  };

  clearQueue = () => {
    this.queue = [];
  };

  play = async () => {
    this.inittialMediaSource();
    if (this.queue.length > 0) {
      this.video.ontimeupdate = (e) => {
        // listen video playing time and get next video when remaining < 10s
        const remaining = this.totalDuration - this.video.currentTime;
        this.queueWaiting = remaining <= 0;
        if (remaining < this.config.nextAt) {
          this.appendNextQueue();
        }
      };

      // append first video for start
      this.appendNextQueue(true);

      // play video;
      this.video.play();
    }
  };

  appendNextQueue = async (isFirst = false) => {
    if (this.queue.length > 0) {
      const videoFecth = await this.fecthVideoBuff(this.queue.shift());
      this.sourceBuffer.timestampOffset += isFirst ? 0 : videoFecth.duration;
      this.sourceBuffer.appendBuffer(videoFecth.buffer);
      this.totalDuration += videoFecth.duration;
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
