(function() {
    // Check if Picture-in-Picture is supported
    if (!document.pictureInPictureEnabled) {
      console.log('Picture-in-Picture not supported');
      return;
    }

    function addPiPButton(video) {
      if (video._pipButtonAdded) return;
      video._pipButtonAdded = true;
  
      const btn = document.createElement('button');
      btn.textContent = '⧉';
      btn.className = 'pip-toggle-btn';
      btn.title = 'Toggle Picture-in-Picture';
      btn.onclick = async e => {
        e.stopPropagation();
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else {
          try {
            // Wait for video to be ready if it's not already
            if (video.readyState < 2) {
              console.log('Video not ready, waiting...');
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error('Video failed to load within 5 seconds'));
                }, 5000);
                
                const onReady = () => {
                  clearTimeout(timeout);
                  video.removeEventListener('loadeddata', onReady);
                  video.removeEventListener('canplay', onReady);
                  resolve();
                };
                
                video.addEventListener('loadeddata', onReady);
                video.addEventListener('canplay', onReady);
                
                // If video is already ready, resolve immediately
                if (video.readyState >= 2) {
                  onReady();
                }
              });
            }
            
            await video.requestPictureInPicture();
          } catch (err) {
            console.error('PiP failed:', err);
          }
        }
      };
      ensureContainer(video).appendChild(btn);
    }
  
    function addCanvasPiP(canvas) {
      if (canvas._pipCanvasAdded) return;
      canvas._pipCanvasAdded = true;

      const btn = document.createElement('button');
      btn.textContent = '⧉';
      btn.className = 'pip-toggle-btn';
      btn.title = 'Toggle Picture-in-Picture (Canvas)';
      btn.onclick = async e => {
        e.stopPropagation();
        
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
          return;
        }

        try {
          // Check if canvas can capture stream
          if (typeof canvas.captureStream !== 'function') {
            throw new Error('Canvas stream capture not supported');
          }

          const stream = canvas.captureStream(30);
          const video = document.createElement('video');
          video.srcObject = stream;
          video.muted = true; // Prevent audio issues
          video.style.display = 'none'; // Hide the temporary video
          
          // Add to DOM temporarily
          document.body.appendChild(video);
          
          await video.play();
          await video.requestPictureInPicture();
          
          // Clean up when PiP ends
          video.addEventListener('leavepictureinpicture', () => {
            video.remove();
          });
          
        } catch (error) {
          console.error('Canvas PiP failed:', error);
        }
      };
      ensureContainer(canvas).appendChild(btn);
    }
  
    function ensureContainer(el) {
      const parent = el.parentElement;
      if (!parent) return document.body; // Fallback if no parent
      
      if (parent.style.position === '' || parent.style.position === 'static') {
        parent.style.position = 'relative';
      }
      return parent;
    }
  
    function scanForMedia() {
      // Find all video elements, including those that might not be ready yet
      document.querySelectorAll('video').forEach(video => {
        // Add button even if video isn't ready yet
        addPiPButton(video);
      });
      
      // Find canvas elements that might be used for video
      document.querySelectorAll('canvas').forEach(canvas => {
        // Only add PiP button to canvas if it seems to be used for video
        // (has reasonable dimensions and might be animated)
        if (canvas.width > 100 && canvas.height > 100) {
          addCanvasPiP(canvas);
        }
      });
      
      // Also check for videos in iframes (same-origin only)
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) {
            iframeDoc.querySelectorAll('video').forEach(addPiPButton);
            iframeDoc.querySelectorAll('canvas').forEach(canvas => {
              if (canvas.width > 100 && canvas.height > 100) {
                addCanvasPiP(canvas);
              }
            });
          }
        } catch (e) {
          // Cross-origin iframe, skip
        }
      });
    }
  
    // Initial scan
    scanForMedia();
    
    // Watch for new elements
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain video or canvas elements
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'VIDEO' || node.tagName === 'CANVAS' || 
                  node.querySelector && (node.querySelector('video') || node.querySelector('canvas'))) {
                shouldScan = true;
              }
            }
          });
        }
      });
      
      if (shouldScan) {
        // Debounce the scan to avoid excessive calls
        clearTimeout(scanForMedia.timeout);
        scanForMedia.timeout = setTimeout(scanForMedia, 100);
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  })();
  