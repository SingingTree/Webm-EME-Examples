/**
 * Key for video contained in big-buck-bunny_trailer_video-clearkey-encrypted.webm
 */
let videoKey = new Uint8Array([
  0x80, 0x8B, 0x9A, 0xDA, 0xC3, 0x84, 0xDE, 0x1E,
  0x4F, 0x56, 0x14, 0x0F, 0x4A, 0xD7, 0x61, 0x94
]);

/**
 * Key id in big-buck-bunny_trailer_video-clearkey-encrypted.webm for {videoKey}
 */
let videoKeyId = "LNsO1hGYU-eFBnHD6ZBsPA";

/**
 * Key for audio contained in big-buck-bunny_trailer_audio-clearkey-encrypted.webm
 */
let audioKey = new Uint8Array([
  0xAC, 0xBD, 0x22, 0xD9, 0x08, 0x35, 0x19, 0x78,
  0x7F, 0x34, 0x37, 0x6C, 0x41, 0x94, 0xB3, 0x97
]);

/**
 * Key id in big-buck-bunny_trailer_audio-clearkey-encrypted.webm for {audioKey}
 */
let audioKeyId = "QU-g5jS0AZ7fyJfhfCE3hg";

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
  if (request.kids.length === 1) {
    log("Got more than one key requested! We don't expect this!");
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
