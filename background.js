// Open the side panel when the user clicks the extension action button.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Associate the panel with the current window and open it.
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (e) {
    // If open fails (older Chrome / policy), there's not much we can do.
    console.error("Failed to open side panel:", e);
  }
});
