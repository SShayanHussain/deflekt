(function() {
  // Setup the styles for the chat bubble and iframe container
  const style = document.createElement('style');
  style.innerHTML = `
    #deflekt-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #deflekt-widget-bubble {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #000;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s;
    }
    #deflekt-widget-bubble:hover {
      transform: scale(1.05);
    }
    #deflekt-widget-iframe-container {
      display: none;
      width: 380px;
      height: 600px;
      max-height: 80vh;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      margin-bottom: 16px;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s;
      border: 1px solid #eaeaea;
    }
    #deflekt-widget-iframe-container.open {
      display: block;
      opacity: 1;
    }
    #deflekt-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    @media (max-width: 480px) {
      #deflekt-widget-iframe-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
      }
    }
  `;
  document.head.appendChild(style);

  // Extract configuration
  const scriptTag = document.currentScript;
  const workspaceId = scriptTag.getAttribute('data-workspace') || window.DeflektConfig?.workspaceId;
  const hostUrl = scriptTag.src.split('/widget.js')[0] || 'http://localhost:3000';

  if (!workspaceId) {
    console.error("Deflekt Widget: data-workspace attribute is missing.");
    return;
  }

  // Build the container
  const container = document.createElement('div');
  container.id = 'deflekt-widget-container';
  
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'deflekt-widget-iframe-container';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'deflekt-iframe';
  iframe.src = `${hostUrl}/widget?workspace=${workspaceId}`;
  
  iframeContainer.appendChild(iframe);
  
  const bubble = document.createElement('div');
  bubble.id = 'deflekt-widget-bubble';
  bubble.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
    </svg>
  `;

  // Toggle behavior
  let isOpen = false;
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframeContainer.classList.add('open');
      bubble.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
        </svg>
      `;
    } else {
      iframeContainer.classList.remove('open');
      bubble.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>
        </svg>
      `;
    }
  });

  container.appendChild(iframeContainer);
  container.appendChild(bubble);
  document.body.appendChild(container);
})();
