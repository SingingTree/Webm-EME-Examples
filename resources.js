let encryptedVideoURL = 'media/big-buck-bunny_trailer_video-clearkey-encrypted.webm';
let encryptedAudioURL = 'media/big-buck-bunny_trailer_audio-clearkey-encrypted.webm';
let audioURL = 'media/big-buck-bunny_trailer_audio.webm';

let subsampleEncryptedVideoUrl = 'media/sintel-trailer_video-clearkey-subsample-encrypted.webm';
let subsampleEncryptedAudioUrl = 'media/sintel-trailer_audio-clearkey-subsample-encrypted.webm';
let subsampleUnencryptedAudioUrl = 'media/sintel-trailer_audio.webm';

let videoMimeType = 'video/webm;codecs="vp8"';
let audioMimeType = 'audio/webm;codecs="vorbis"';

/**
 * Write a message to the log <div> on page
 * @param msg - The message to log
 */
function log(msg) {
  "use strict";
  let logDiv = document.getElementById('log');
  logDiv.appendChild(document.createTextNode(msg));
  logDiv.appendChild(document.createElement("br"));
}

/**
 * Updates the video text and progress bar on page with information from the
 * progress event. Intended to be passed into the {loadSourceBuffer} function as
 * a progress callback
 * @param e - The progress event from an xhr
 */
function updateVideoProgress(e) {
  "use strict";
  let videoProgressText = document.getElementById('videoProgressText');
  let videoProgressBar = document.getElementById('videoProgressBar');
  if(e.lengthComputable) {
    videoProgressText.innerHTML  = (e.loaded / e.total) * 100;
    videoProgressBar.value = (e.loaded / e.total) * 100;
  } else {
    videoProgressText.innerHTML  = "Length not computable";
  }
}

/**
 * Updates the audio text and progress bar on page with information from the
 * progress event. Intended to be passed into the {loadSourceBuffer} function as
 * a progress callback
 * @param e - The progress event from an xhr
 */
function updateAudioProgress(e) {
  "use strict";
  let audioProgressText = document.getElementById('audioProgressText');
  let audioProgressBar = document.getElementById('audioProgressBar');
  if(e.lengthComputable) {
    audioProgressText.innerHTML  = (e.loaded / e.total) * 100;
    audioProgressBar.value = (e.loaded / e.total) * 100;
  } else {
    audioProgressText.innerHTML  = "Length not computable";
  }
}

/**
 * Helper function to fetch a resource at a url into an array buffer with xhr
 * @param url - The URL to fetch from
 * @param onLoadFunc - A callback for when with xhr.response once the xhr has
 * loaded
 * @param onProgressFunc - A callback for when the xhr emits 'progress' events
 */
function fetchArrayBuffer(url, onLoadFunc, onProgressFunc) {
  "use strict";
  log('Fetching from URL: ' + url);
  let xhr = new XMLHttpRequest();
  xhr.onprogress = onProgressFunc;
  xhr.open('get', url);
  xhr.responseType = 'arraybuffer';
  xhr.onload = () => {
    onLoadFunc(xhr.response);
  };
  xhr.send();
}
