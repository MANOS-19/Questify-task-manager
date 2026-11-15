const API_CONFIG = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_ROOT = API_CONFIG.endsWith("/api/tasks")
  ? API_CONFIG.slice(0, -6)
  : API_CONFIG.endsWith("/api")
    ? API_CONFIG
    : `${API_CONFIG}/api`;

// Unique ID for this browser
function getBrowserId() {
  let browserId = localStorage.getItem("questify-browser-id");

  if (!browserId) {
    browserId = crypto.randomUUID();

    localStorage.setItem("questify-browser-id", browserId);
  }

  return browserId;
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Enable push notifications
export async function enablePushNotifications() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    throw new Error("Your browser does not support push notifications.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register("/sw.js");

  await navigator.serviceWorker.ready;

  // Get public VAPID key
  const keyResponse = await fetch(
    `${API_ROOT}/push/public-key`
  );

  if (!keyResponse.ok) {
    throw new Error("Unable to retrieve the notification public key.");
  }

  const { publicKey } = await keyResponse.json();

  // Check for an existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  // Save subscription in MongoDB
  const response = await fetch(`${API_ROOT}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      browserId: getBrowserId(),
      subscription: subscription.toJSON()
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to save subscription.");
  }

  return result;
}

// Send test notification
export async function sendTestPushNotification() {
  const response = await fetch(`${API_ROOT}/push/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      browserId: getBrowserId()
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Test notification failed.");
  }

  return result;
}

// Disable push notifications
export async function disablePushNotifications() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported.");
  }

  const registration =
    await navigator.serviceWorker.getRegistration();

  const subscription =
    await registration?.pushManager.getSubscription();

  if (!subscription) {
    return { message: "No active subscription found." };
  }

  // Remove subscription from MongoDB
  const response = await fetch(`${API_ROOT}/push/unsubscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      browserId: getBrowserId(),
      endpoint: subscription.endpoint
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to disable notifications.");
  }

  // Unsubscribe this browser
  await subscription.unsubscribe();

  return data;
}