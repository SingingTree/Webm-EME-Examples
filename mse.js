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
  log('Loading: ' + mediaURL);
  log('Media source state: ' + mediaSource.readyState); // open
  var sourceBuffer = mediaSource.addSourceBuffer(mediaMimeType);
  // Promise to resolve when our source buffer has updateend
  var fetchedPromise = new Promise(function(resolve, reject) {
    sourceBuffer.addEventListener('updateend', function () {
      resolve();
    });
  });
  fetchArrayBuffer(
    mediaURL,
    function(buf) {
      sourceBuffer.appendBuffer(buf);
    },
    progressCallback
  );
  return fetchedPromise;
}
