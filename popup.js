document.getElementById('toggle').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Check if PiP is supported
        if (!document.pictureInPictureEnabled) {
          alert('Picture-in-Picture is not supported in this browser');
          return;
        }

        // Exit PiP if already active
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
          return;
        }

        // Function to find videos in current document or iframes
        function findVideos() {
          let videos = [];
          
          // Find videos in main document
          videos.push(...Array.from(document.querySelectorAll('video')));
          
          // Find videos in iframes (same-origin only)
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc) {
                videos.push(...Array.from(iframeDoc.querySelectorAll('video')));
              }
            } catch (e) {
              // Cross-origin iframe, skip
              console.log('Skipping cross-origin iframe');
            }
          });
          
          return videos;
        }

        const allVideos = findVideos();
        
        if (allVideos.length === 0) {
          alert('No video elements found on this page');
          return;
        }

        // Try to find the best video to use for PiP
        let targetVideo = null;

        // Priority 1: Currently playing video
        targetVideo = allVideos.find(v => !v.paused && v.currentTime > 0);
        
        // Priority 2: Video with loaded data (readyState >= 2)
        if (!targetVideo) {
          targetVideo = allVideos.find(v => v.readyState >= 2);
        }
        
        // Priority 3: Any video with a source
        if (!targetVideo) {
          targetVideo = allVideos.find(v => v.src || (v.currentSrc && v.currentSrc !== ''));
        }
        
        // Priority 4: First video element found
        if (!targetVideo) {
          targetVideo = allVideos[0];
        }

        if (targetVideo) {
          console.log('Attempting PiP with video:', targetVideo);
          targetVideo.requestPictureInPicture().catch(err => {
            console.error('PiP failed:', err);
            alert(`Failed to enter Picture-in-Picture mode: ${err.message}`);
          });
        } else {
          alert('No suitable video found for Picture-in-Picture');
        }
      }
    });
  } catch (error) {
    console.error('Extension error:', error);
    alert(`Extension error: ${error.message}`);
  }
});