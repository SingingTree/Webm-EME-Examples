/**
 * Write a message to the log <div> on page
 * @param msg - The message to log
 */
function log(msg) {
  "use strict";
  let logDiv = document.getElementById("log");
  logDiv.appendChild(document.createTextNode(msg));
  logDiv.appendChild(document.createElement("br"));
}

/**
 * Create a source buffer and attempt to fetch media data from a url into it.
 * @param mediaSource - The mediaSource object to add the buffer to.
 * @param mediaUrl - The URL to fetch the media from.
 * @param mediaMimeType - The mime type of the media being fetched.
 * @param progressCallback - The callback to be used by xhr during fetching.
 * @return A promise that will be resolved once the source buffer had received
 * the 'updateend' event.
 */
function loadSourceBuffer(mediaSource, mediaURL, mediaMimeType, progressCallback) {
  "use strict";
  log("Loading: " + mediaURL);
  log("Media source state: " + mediaSource.readyState); // open
  let sourceBuffer = mediaSource.addSourceBuffer(mediaMimeType);
  // Promise to resolve when our source buffer has updateend
  let fetchedPromise = new Promise(resolve => {
    sourceBuffer.addEventListener("updateend", () => {
      resolve();
    });
  });
  fetchArrayBuffer(
    mediaURL,
    buf => {
      sourceBuffer.appendBuffer(buf);
    },
    progressCallback
  );
  return fetchedPromise;
}

/**
 * Updates the video text and progress bar on page with information from the
 * progress event. Intended to be passed into the {loadSourceBuffer} function as
 * a progress callback
 * @param e - The progress event from an xhr
 */
function updateVideoProgress(e) {
  "use strict";
  let videoProgressText = document.getElementById("videoProgressText");
  let videoProgressBar = document.getElementById("videoProgressBar");
  if (e.lengthComputable) {
    videoProgressText.innerText  = `${(e.loaded / e.total) * 100}%: `;
    videoProgressBar.value = (e.loaded / e.total) * 100;
  } else {
    videoProgressText.innerText  = "Length not computable";
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
  let audioProgressText = document.getElementById("audioProgressText");
  let audioProgressBar = document.getElementById("audioProgressBar");
  if (e.lengthComputable) {
    audioProgressText.innerText  = `${(e.loaded / e.total) * 100}%: `;
    audioProgressBar.value = (e.loaded / e.total) * 100;
  } else {
    audioProgressText.innerText  = "Length not computable";
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
  log("Fetching from URL: " + url);
  let xhr = new XMLHttpRequest();
  xhr.onprogress = onProgressFunc;
  xhr.open("get", url);
  xhr.responseType = "arraybuffer";
  xhr.onload = () => {
    onLoadFunc(xhr.response);
  };
  xhr.send();
}

/**
 * Key for video content
 */
const videoKey = new Uint8Array([
  0x80, 0x8B, 0x9A, 0xDA, 0xC3, 0x84, 0xDE, 0x1E,
  0x4F, 0x56, 0x14, 0x0F, 0x4A, 0xD7, 0x61, 0x94
]);

/**
 * Key id for {videoKey}
 */
const videoKeyId = "LNsO1hGYU-eFBnHD6ZBsPA";

/**
 * Key for audio content
 */
const audioKey = new Uint8Array([
  0xAC, 0xBD, 0x22, 0xD9, 0x08, 0x35, 0x19, 0x78,
  0x7F, 0x34, 0x37, 0x6C, 0x41, 0x94, 0xB3, 0x97
]);

/**
 * Key id for {audioKey}
 */
const audioKeyId = "QU-g5jS0AZ7fyJfhfCE3hg";

/**
 * Map from key ids to actual keys. This is used when generating licenses
 */
let keyMap = new Map();
keyMap.set(videoKeyId, videoKey);
keyMap.set(audioKeyId, audioKey);

/**
 * Helper to convert Uint8Array into base64 using base64url alphabet, without padding.
 * @param u8arr - An array of bytes to convert to base64.
 * @return A base 64 encoded string
 */
function toBase64(u8arr) {
  "use strict";
  return btoa(String.fromCharCode.apply(null, u8arr)).
      replace(/\+/g, "-").replace(/\//g, "_").replace(/=*$/, "");
}
/**
 * Attempts to setup key system access, create media keys, and set those keys on
 * a media element.
 * @param video - The media element to setup media keys on.
 * @param config - The MediaKeySystemConfiguration to be used when requesting key
 * system access.
 * @return A promise that will be resolved upon successfully setting the media
 * keys on the passed video, or rejected with reason if the process fails.
 */
async function setupMediaKeys(video, config) {
  "use strict";
  let keySystemAccess = await navigator.requestMediaKeySystemAccess("org.w3.clearkey", config);
  let mediaKeys = await keySystemAccess.createMediaKeys();
  return video.setMediaKeys(mediaKeys);
}

/**
 * Function that handles the encrypted event fired by a media element. Deligates
 * to other functions to handle license requests.
 * @param e - The encrypted event.
 * @return The promise created by MediaKeySession.generateRequest
 */
function encryptedEventHandler(e) {
  "use strict";
  log("Got encrypted event");

  let video = e.target;
  let session = video.mediaKeys.createSession();
  session.addEventListener("message", messageHandler);
  return session.generateRequest(e.initDataType, e.initData);
}

/**
 * Generates a clearkey license for a given license request.
 * @param message - A message from the CDM desribing a licence request.
 * @return A JSON string of the clearkey license object for the given message.
 */
function generateLicense(message) {
  "use strict";
  // Parse the clearkey license request.
  let request = JSON.parse(new TextDecoder().decode(message));
  // We expect to only have one key requested at a time
  if (request.kids.length != 1) {
    log(`Got more than one key requested (got ${request.kids.length})! We don't expect this!`);
  }

  // Create our clear key object, looking up the key based on the key id
  let keyObj = {
    kty: "oct",
    alg: "A128KW",
    kid: request.kids[0],
    k: toBase64(keyMap.get(request.kids[0]))
  };
  return new TextEncoder().encode(JSON.stringify({
    keys: [keyObj]
  }));
}

/**
 * Generates a clearkey license for a given license request.
 * @param e - The 'message' event
 */
function messageHandler(e) {
  "use strict";
  let session = e.target;
  let license = generateLicense(e.message);
  session.update(license).catch(
    function(failureReason) {
     log("update() failed: " + failureReason.message);
    }
  );
}

/**
 * Programatically setup a page with some encrypted media. Creates and inserts
 * all elements into the page and configures the media element as required
 * to play encrypted media.
 * @param {string} audio A string indicating the desired audio content, should
 * be chosen from "fullEncryption", "subsampleEncrption", "clear", or null
 * @param {string} video A string indicating the desired video content, should
 * be chosen from "fullEncryption", "subsampleEncryption", or null -- clear
 * video is not expected
 */
function setupPage(audio, video) { // eslint-disable-line no-unused-vars
  const clearBunnyAudioUrl = "media/big-buck-bunny_trailer_audio.webm";  
  const clearSintelAudioUrl = "media/sintel-trailer_audio.webm";
  const encryptedBunnyAudioUrl = "media/big-buck-bunny_trailer_audio-clearkey-encrypted.webm";
  const subsampleEncryptedSintelAudioUrl = "media/sintel-trailer_audio-clearkey-subsample-encrypted.webm";

  const encryptedBunnyVideoUrl = "media/big-buck-bunny_trailer_video-clearkey-encrypted.webm";
  const subsampleEncryptedSintelVideoUrl = "media/sintel-trailer_video-clearkey-subsample-encrypted.webm";

  const vp8MimeType = "video/webm;codecs=\"vp8\"";
  const vp9MimeType = "video/webm;codecs=\"vp9\"";
  const opusMimeType = "audio/webm;codecs=\"opus\"";
  const vorbisMimeType = "audio/webm;codecs=\"vorbis\"";

  // Setup github fork me banner
  let githubBannerAnchor = document.createElement("a");
  githubBannerAnchor.href = "https://github.com/SingingTree/Webm-EME-Examples";
  let githubBannerImage = document.createElement("img");
  githubBannerImage.style = "position: absolute; top: 0; right: 0; border: 0;";
  githubBannerImage.src = "https://s3.amazonaws.com/github/ribbons/forkme_right_orange_ff7600.png";
  githubBannerImage.alt = "Fork me on GitHub";
  githubBannerAnchor.appendChild(githubBannerImage);
  document.body.appendChild(githubBannerAnchor);

  // Setup header
  let header = document.createElement("h1");
  header.innerText = "Media Source Extensions and Encrypted Media Extensions with WebM";
  document.body.appendChild(header);
  
  // Setup progress bar div, we'll add relevant bars to it after figuring out
  // if we have audio and video
  let progressDiv = document.createElement("div");
  progressDiv.id = "progress";
  document.body.appendChild(progressDiv);
  
  // Create HtmlMediaElement, we'll finish config for this later once we've
  // selected our video and/or audio
  let mediaElement = document.createElement("video");
  mediaElement.controls = true;
  mediaElement.preload = "auto";
  document.body.appendChild(mediaElement);

  // Create log div, we'll finish this up after knowing what media we have later
  let logDiv = document.createElement("div");
  logDiv.id = "log";
  document.body.appendChild(logDiv);

  // Figure out what our audio and video files are, we'll use this information
  // to set up elements in our page.
  let videoUrl = null;
  let videoMimeType = null;
  switch (video) {
    case "fullEncryption":
      videoUrl = encryptedBunnyVideoUrl;
      videoMimeType = vp8MimeType;
      break;
    case "subsampleEncryption":
      videoUrl = subsampleEncryptedSintelVideoUrl;
      videoMimeType = vp9MimeType;
      break;
    case "clear":
      // Log an error, treat as null
      log("clear video requested, this is unexpected, treating as null!");
      break;
    default:
      // Log an error, treat as null
      log(`Unrecognized video requested (${video}), treating as null!`);
      break
    case null:
      break; // No-op
  }
  let audioUrl = null;
  let audioMimeType = null;
  switch (audio) {
    case "fullEncryption":
      audioUrl = encryptedBunnyAudioUrl;
      audioMimeType = vorbisMimeType;
      break;
    case "subsampleEncryption":
      audioUrl = subsampleEncryptedSintelAudioUrl;
      audioMimeType = opusMimeType;
      break;
    case "clear":
      if (video == "fullEncryption") {
        audioUrl = clearBunnyAudioUrl;
        audioMimeType = vorbisMimeType;
      } else if (video == "subsampleEncryption") {
        audioUrl = clearSintelAudioUrl;
        audioMimeType = opusMimeType;
      } else {
        // Log an error
        log("clear audio requested, but video not set, expect bustages!");
      }
      break;
    default:
      log(`Unrecognized audio requested (${audio}), treating as null!`);
      // Log an error, but fall through to null case
      break;
    case null:
      break; // No-op
  }
  // Media urls and mime types should now be known

  // Finish setting up progress div
  if (audioUrl) {
    let audioProgressDiv = document.createElement("div");
    audioProgressDiv.innerText = "Audio downloaded: ";
    let audioProgressText = document.createElement("span");
    audioProgressText.id = "audioProgressText";
    audioProgressText.innerText = "0%: ";
    audioProgressDiv.appendChild(audioProgressText);
    let audioProgressBar = document.createElement("progress");
    audioProgressBar.id = "audioProgressBar";
    audioProgressBar.max = 100;
    audioProgressBar.value = 0;
    audioProgressDiv.appendChild(audioProgressBar);
    progressDiv.appendChild(audioProgressDiv);
  }
  if (videoUrl) {
    let videoProgressDiv = document.createElement("div");
    videoProgressDiv.innerText = "Video downloaded: ";
    let videoProgressText = document.createElement("span");
    videoProgressText.id = "videoProgressText";
    videoProgressText.innerText = "0%: ";
    videoProgressDiv.appendChild(videoProgressText);
    let videoProgressBar = document.createElement("progress");
    videoProgressBar.id = "videoProgressBar";
    videoProgressBar.max = 100;
    videoProgressBar.value = 0;
    videoProgressDiv.appendChild(videoProgressBar);
    progressDiv.appendChild(videoProgressDiv);
  }
  // Progress div finished

  // Finish setting up HtmlMediaElement by connecting media and setting up
  // EME handling
  let keySystemConfig = {
    initDataTypes: ["webm"]
  };
  if (videoUrl) {
    keySystemConfig.videoCapabilities = [{contentType: videoMimeType}];
  }
  if (audioUrl) {
    keySystemConfig.audioCapabilities = [{contentType: audioMimeType}];
  }
  let config = [
    keySystemConfig
  ];

  let mediaSource = new MediaSource();
  log("Media source state: " + mediaSource.readyState); // Should be closed

  mediaElement.addEventListener("error", e => {
    log("Got error!: " + e);
  });
  setupMediaKeys(mediaElement, config).then(
    () => {
      mediaElement.addEventListener("encrypted", encryptedEventHandler);
      mediaElement.src = URL.createObjectURL(mediaSource);
      mediaSource.addEventListener("sourceopen", () => {
        let promises = [];
        if (videoUrl) {
          promises.push(
            loadSourceBuffer(mediaSource, videoUrl,
              vp8MimeType, updateVideoProgress)
          )
        }
        if (audioUrl) {
          promises.push(
            loadSourceBuffer(mediaSource, audioUrl,
              vorbisMimeType, updateAudioProgress)
          );
        }
        Promise.all(promises).then(() => {
          mediaSource.endOfStream();
          log("Media source state: " + mediaSource.readyState); // Should be ended
          mediaElement.play();
        });
      });
    },
    failureReason => {
      log("Failed to setup media keys: " + failureReason.message);
    }
  );
}