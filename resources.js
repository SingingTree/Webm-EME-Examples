var encryptedVideoURL = 'media/big-buck-bunny_trailer_video-clearkey-encrypted.webm';
var encryptedAudioURL = 'media/big-buck-bunny_trailer_audio-clearkey-encrypted.webm';
var audioURL = 'media/big-buck-bunny_trailer_audio.webm';

var subsampleEncryptedVideoUrl = 'media/sintel-trailer_video-clearkey-subsample-encrypted.webm';
var subsampleEncryptedAudioUrl = 'media/sintel-trailer_audio-clearkey-subsample-encrypted.webm';
var subsampleUnencryptedAudioUrl = 'media/sintel-trailer_audio.webm';

var videoMimeType = 'video/webm;codecs="vp8"';
var audioMimeType = 'audio/webm;codecs="vorbis"';

/**
 * Write a message to the log <div> on page
 * @param msg - The message to log
 */
function log(msg) {
  "use strict";
  var logDiv = document.getElementById('log');
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
  var videoProgressText = document.getElementById('videoProgressText');
  var videoProgressBar = document.getElementById('videoProgressBar');
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
  var audioProgressText = document.getElementById('audioProgressText');
  var audioProgressBar = document.getElementById('audioProgressBar');
  if(e.lengthComputable) {
    audioProgressText.innerHTML  = (e.loaded / e.total) * 100;
    audioProgressBar.value = (e.loaded / e.total) * 100;
  } else {
    audioProgressText.innerHTML  = "Length not computable";
  }
}

/**
 * Helper funtion to fetch a resource at a url into an array buffer with xhr
 * @param url - The URL to fetch from
 * @param onLoadFunc - A function to call with xhr.response once the xhr has
 * loaded
 * @param progressFunc - A callback for when the xhr emits 'progress' events
 */
function fetchArrayBuffer(url, onLoadFunc, progressFunc) {
  "use strict";
  log('Fetching from URL: ' + url);
  var xhr = new XMLHttpRequest();
  xhr.onprogress = progressFunc;
  xhr.open('get', url);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function () {
    onLoadFunc(xhr.response);
  };
  xhr.send();
}
