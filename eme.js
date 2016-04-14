/**
 * Key for video contained in big-buck-bunny_trailer_video-clearkey-encrypted.webm
 */
var videoKey = new Uint8Array([
  0x80, 0x8B, 0x9A, 0xDA, 0xC3, 0x84, 0xDE, 0x1E,
  0x4F, 0x56, 0x14, 0x0F, 0x4A, 0xD7, 0x61, 0x94
]);

/**
 * Key id in big-buck-bunny_trailer_video-clearkey-encrypted.webm for {videoKey}
 */
var videoKeyId = 'LNsO1hGYU-eFBnHD6ZBsPA';

/**
 * Key for audio contained in big-buck-bunny_trailer_audio-clearkey-encrypted.webm
 */
var audioKey = new Uint8Array([
  0xAC, 0xBD, 0x22, 0xD9, 0x08, 0x35, 0x19, 0x78,
  0x7F, 0x34, 0x37, 0x6C, 0x41, 0x94, 0xB3, 0x97
]);

/**
 * Key id in big-buck-bunny_trailer_audio-clearkey-encrypted.webm for {audioKey}
 */
var audioKeyId = 'QU-g5jS0AZ7fyJfhfCE3hg';

/**
 * Map from key ids to actual keys. This is used when generating licenses
 */
var keyMap = new Map();
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
      replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '');
}
/**
 * Attemps to setup key system access, create media keys, and set those keys on
 * a media element.
 * @param video - The media element to setup media keys on.
 * @param config - The MediaKeySystemConfiguration to be used when requesint key
 * system access.
 * @return A promise that will be resolved upon successfully setting the meida
 * keys on the passed video, or rejected with reason if the process fails.
 */
function setupMediaKeys(video, config) {
  "use strict";
  return new Promise(function(resolve, reject) {
    navigator.requestMediaKeySystemAccess('org.w3.clearkey', config).then(
      function(keySystemAccess) {
        var mediaKeysPromise = keySystemAccess.createMediaKeys().then(
          function(createdMediaKeys) {
            return video.setMediaKeys(createdMediaKeys);
          },
          function(failureReason) {
            // requestMediaKeySystemAccess rejected
            reject(failureReason);
          }
        ).then(
          function() {
            // Media keys have been set, resolve this functions promise
            resolve();
          },
          function(failureReason) {
            // setMediaKeys rejected
            reject(failureReason);
          }
        );
      },
      function(failureReason) {
        // requestMediaKeySystemAccess rejected
        reject(failureReason);
      }
    );
  });
}

/**
 * Function that handles the encrypted event fired by a media element. Deligates
 * to other functions to handle license requests.
 * @param e - The encrypted event.
 * @return The promise created by MediaKeySession.generateRequest
 */
function encryptedEventHandler(e) {
  "use strict";
  log('Got encrypted event');

  var video = e.target;
  var session = video.mediaKeys.createSession();
  session.addEventListener('message', messageHandler);
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
  var request = JSON.parse(new TextDecoder().decode(message));
  // We expect to only have one key requested at a time
  console.assert(request.kids.length === 1);

  // Create our clear key object, looking up the key based on the key id
  var keyObj = {
    kty: 'oct',
    alg: 'A128KW',
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
  var session = e.target;
  var license = generateLicense(e.message);
  session.update(license).catch(
    function(failureReason) {
     log('update() failed: ' + failureReason.message);
    }
  );
}
