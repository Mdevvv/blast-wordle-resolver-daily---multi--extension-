// Array to store tabs we're attached to
const debuggedTabs = {};
const trackedWebSockets = {};

// Variables for popup window management
let popupWindowId = null;
let pendingMessages = [];

// Function to open popup window
function openPopupWindow() {
    if (popupWindowId) {
        // Focus existing window if already open
        chrome.windows.update(popupWindowId, { focused: true });
        return;
    }
    
    chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 600,
        height: 500
    }, function(window) {
        popupWindowId = window.id;
        
        // Send any pending messages once popup is ready
        if (pendingMessages.length > 0) {
            setTimeout(() => {
                pendingMessages.forEach(msg => {
                    chrome.runtime.sendMessage(msg);
                });
                pendingMessages = [];
            }, 500);
        }
    });
}

// Function to send message to popup
function sendToPopup(messageData) {
    if (!popupWindowId) {
        pendingMessages.push(messageData);
        return;
    }
    
    chrome.runtime.sendMessage(messageData);
}

// Handle popup window closure
chrome.windows.onRemoved.addListener(function(windowId) {
    if (windowId === popupWindowId) {
        popupWindowId = null;
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message) {
    if (message.type === 'popup-ready') {
        if (pendingMessages.length > 0) {
            pendingMessages.forEach(msg => {
                chrome.runtime.sendMessage(msg);
            });
            pendingMessages = [];
        }
    }
});

// Function to attach debugger to a tab
function attachDebugger(tabId) {
    if (debuggedTabs[tabId]) return;
    
    chrome.debugger.attach({tabId: tabId}, "1.0", function() {
        if (chrome.runtime.lastError) {
            console.error("Debugger attachment error:", chrome.runtime.lastError);
            return;
        }
        
        debuggedTabs[tabId] = true;
        console.log("Debugger attached to tab:", tabId);
        
        // Enable network monitoring
        chrome.debugger.sendCommand({tabId: tabId}, "Network.enable", {}, function() {
            if (chrome.runtime.lastError) {
                console.error("Network activation error:", chrome.runtime.lastError);
            }
        });
    });
}

// Monitor creation of new tabs
chrome.tabs.onCreated.addListener(function(tab) {
    attachDebugger(tab.id);
});

// Monitor tab updates to find blast.tv pages
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('blast.tv')) {
        attachDebugger(tabId);
    }
});

// Handle tab removal
chrome.tabs.onRemoved.addListener(function(tabId) {
    if (debuggedTabs[tabId]) {
        delete debuggedTabs[tabId];
    }
});

// Capture WebSocket events
chrome.debugger.onEvent.addListener(function(debuggeeId, message, params) {
    const tabId = debuggeeId.tabId;
    
    // Capture WebSocket creation
    if (message === "Network.webSocketCreated") {
        if (params.url && params.url.includes('minigames-ws.blast.tv/parties/game')) {
            console.log(`WebSocket created: ${params.url} (ID: ${params.requestId})`);
            trackedWebSockets[params.requestId] = params.url;
        }
    }
    
    // Capture WebSocket handshake to see headers
    if (message === "Network.webSocketHandshakeResponseReceived") {
        const url = trackedWebSockets[params.requestId];
        if (url && url.includes('minigames-ws.blast.tv/parties/game')) {
            console.log(`WebSocket handshake for ${url}:`, params.response.headers);
            
            // Open popup window after handshake is detected
            openPopupWindow();
            
            // Send connection info to popup
            sendToPopup({
                type: 'websocket-connected',
                url: url
            });
        }
    }
    
    // Capture data received from tracked WebSockets
    if (message === "Network.webSocketFrameReceived") {
        const url = trackedWebSockets[params.requestId];
        if (url && url.includes('minigames-ws.blast.tv/parties/game')) {
            const payloadData = params.response.payloadData;
            
            // Using simple string search instead of JSON parsing for filtering
            if (payloadData.includes('"nickname":"') && !payloadData.includes('"nickname":"****"')) {
                console.log(`Message received on WebSocket ${params.requestId}:`);
                
                try {
                    const parsedData = JSON.parse(payloadData);
                    if (parsedData.players && parsedData.players[1] && parsedData.players[1].guesses) {
                        const listGuesses = parsedData.players[1].guesses;
                        const lastGuesses = listGuesses[listGuesses.length - 1];  
                        console.log(`Raw data: ${JSON.stringify(lastGuesses)}`);
                        
                        // Send the guess result to popup for filtering
                        sendToPopup({
                            type: 'guess-result',
                            data: lastGuesses
                        });
                    }
                } catch (e) {
                    console.error("Error extracting guess data:", e);
                }
            }
            
            try {
                const data = JSON.parse(payloadData);
                
                // Continue sending all data to popup (no filtering)
                sendToPopup({
                    type: 'websocket-message',
                    direction: 'received',
                    data: data
                });
            } catch (e) {
                console.error("Error parsing WebSocket data:", e);
                console.log("Non-JSON data received");
            }
        }
    }
    
    // Also capture sent data
    if (message === "Network.webSocketFrameSent") {
        const url = trackedWebSockets[params.requestId];
        if (url && url.includes('minigames-ws.blast.tv/parties/game')) {
            console.log(`Message sent on WebSocket ${params.requestId}:`);
            console.log(`Raw data: ${params.response.payloadData}`);
            
            try {
                const payloadData = params.response.payloadData;
                const data = JSON.parse(payloadData);
                
                // Send all data to popup (no filtering)
                sendToPopup({
                    type: 'websocket-message',
                    direction: 'sent',
                    data: data
                });
            } catch (e) {
                console.error("Error parsing WebSocket data:", e);
                // Still log non-JSON messages
                console.log("Non-JSON data sent");
            }
        }
    }
});

// Attach debugger to existing tabs at startup
chrome.tabs.query({}, function(tabs) {
    for (let tab of tabs) {
        if (tab.url && tab.url.includes('blast.tv')) {
            attachDebugger(tab.id);
        }
    }
});

console.log("Blast WebSocket Monitor extension loaded and active");