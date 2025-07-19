// ==UserScript==
// @name         ChatGPT Auto‑Select Reason
// @namespace    https://github.com/ayoubdya/ChatGPT-Auto-Select-Reason
// @version      1.0.1
// @description  Select Reason Option Automatically in ChatGPT
// @author       ayoubdya
// @license      MIT
// @match        *://*.chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// @run-at       document-idle
// @downloadURL  https://github.com/ayoubdya/ChatGPT-Auto-Select-Reason/raw/master/script.user.js
// @updateURL    https://github.com/ayoubdya/ChatGPT-Auto-Select-Reason/raw/master/script.user.js
// ==/UserScript==


(function () {
  'use strict';

  const CONFIG = {
    selectors: {
      toolsButton: "#system-hint-button",
      reasonOption: "div[role='menuitemradio']",
      selectedOption: "button[data-is-selected='true']",
      reasonText: "Reason"
    },
    timeouts: {
      waitForElement: 5000,
      apiDelay: 500,
      retryDelay: 1000
    },
    maxRetries: 3,
    debug: false
  };

  const logger = {
    log: (msg) => CONFIG.debug && console.log(`[Auto-Select Reason] ${msg}`),
    error: (msg, err) => console.error(`[Auto-Select Reason] ${msg}`, err),
    warn: (msg) => console.warn(`[Auto-Select Reason] ${msg}`)
  };

  function simulateClick(element) {
    if (!element) {
      logger.warn('Attempted to click null element');
      return false;
    }

    try {
      const events = ['pointerdown', 'pointerup', 'click'];

      events.forEach(eventType => {
        const EventConstructor = eventType.startsWith('pointer') ? PointerEvent : MouseEvent;
        const eventOptions = {
          bubbles: true,
          cancelable: true,
        };

        const event = new EventConstructor(eventType, eventOptions);
        element.dispatchEvent(event);
      });

      logger.log(`Successfully clicked element: ${element.tagName}`);
      return true;
    } catch (error) {
      logger.error('Failed to simulate click', error);
      return false;
    }
  }

  function waitForElement(selector, timeout = CONFIG.timeouts.waitForElement) {
    return new Promise((resolve, reject) => {
      const existingElement = document.querySelector(selector);
      if (existingElement) {
        logger.log(`Element found immediately: ${selector}`);
        return resolve(existingElement);
      }

      let timeoutId;
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          logger.log(`Element found after waiting: ${selector}`);
          resolve(element);
        }
      });

      observer.observe(document, {
        childList: true,
        subtree: true,
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        const error = new Error(`Timeout waiting for element: ${selector}`);
        logger.error('Element wait timeout', error);
        reject(error);
      }, timeout);
    });
  }

  function isReasonSelected() {
    try {
      const selectedElement = document.querySelector(CONFIG.selectors.selectedOption);
      const isSelected = selectedElement?.textContent?.trim() === CONFIG.selectors.reasonText;
      logger.log(`Reason selected status: ${isSelected}`);
      return isSelected;
    } catch (error) {
      logger.error('Error checking if Reason is selected', error);
      return false;
    }
  }

  async function enableReason({ retryCount = 0, initialCall = false } = {}) {
    try {
      logger.log(`Attempting to enable Reason (attempt ${retryCount + 1}/${CONFIG.maxRetries + 1})`);

      if (isReasonSelected()) {
        logger.log('Reason is already selected');
        return true;
      }

      const toolsButton = await waitForElement(CONFIG.selectors.toolsButton);

      // Wait for API response from: chatgpt.com/backend-api/system_hints
      if (initialCall) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.timeouts.apiDelay));
      }

      if (!simulateClick(toolsButton)) {
        throw new Error('Failed to click tools button');
      }

      const reasonOption = await waitForElement(CONFIG.selectors.reasonOption);

      if (!simulateClick(reasonOption)) {
        throw new Error('Failed to click reason option');
      }

      // await new Promise(resolve => setTimeout(resolve, 200));
      if (isReasonSelected()) {
        logger.log('Successfully enabled Reason');
        return true;
      } else {
        throw new Error('Reason was not properly selected');
      }

    } catch (error) {
      logger.error(`Failed to enable Reason (attempt ${retryCount + 1})`, error);

      if (retryCount < CONFIG.maxRetries) {
        logger.log(`Retrying in ${CONFIG.timeouts.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.timeouts.retryDelay));
        return enableReason({ retryCount: retryCount + 1 });
      } else {
        logger.error('Max retries exceeded, giving up');
        return false;
      }
    }
  }

  function initialize() {
    logger.log('Initializing Auto-Select Reason script');

    enableReason({ initialCall: true }).catch(error => {
      logger.error('Initial enableReason failed', error);
    });

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;

          if (node.matches?.(CONFIG.selectors.toolsButton) ||
            node.querySelector?.(CONFIG.selectors.toolsButton)) {
            logger.log('Tools button detected, attempting to enable Reason');
            enableReason().catch(error => {
              logger.error('Dynamic enableReason failed', error);
            });
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.log('Script initialized successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();