const CHANNEL_NAME = "auth-sync-channel";

export const AuthSignal = {
  REFRESH: "AUTH_REFRESH",
  EXPIRED: "AUTH_EXPIRED",
};

let channel = null;

const getChannel = () => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
};

/**
 * 廣播認證變更信號（不帶任何 Payload）
 * @param {string} signal 信號類型
 * @param {boolean} includeSelf 是否同時觸發當前分頁本身的事件處理
 */
export const broadcastAuthSignal = (signal = AuthSignal.REFRESH, includeSelf = false) => {
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ signal, timestamp: Date.now() });
  }

  if (includeSelf && typeof window !== "undefined") {
    if (signal === AuthSignal.EXPIRED) {
      window.dispatchEvent(new Event("auth-expired"));
    }
  }
};

/**
 * 訂閱認證變更信號（由其他分頁觸發）
 * @param {(signal: string) => void} handler
 * @returns {() => void} 取消訂閱函式
 */
export const subscribeAuthSignal = (handler) => {
  const ch = getChannel();
  if (!ch) return () => {};

  const listener = (event) => {
    if (event.data?.signal) {
      handler(event.data.signal);
    }
  };

  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
};
