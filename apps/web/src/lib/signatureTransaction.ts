export class SignatureTimeoutError extends Error {
  readonly code = "SIGNATURE_TIMEOUT";

  constructor(message = "Signature request timed out") {
    super(message);
    this.name = "SignatureTimeoutError";
  }
}

function getTimeoutMs(): number {
  const sec = Number(import.meta.env.VITE_SIGNATURE_TIMEOUT_SECONDS ?? 120);
  return Math.max(10, Number.isFinite(sec) ? sec : 120) * 1000;
}

export async function sendTransactionWithSignatureDeadline<T>(options: {
  send: () => Promise<T>;
  onBeforeSign?: () => void;
  onCountdown?: (secondsLeft: number | null) => void;
}): Promise<T> {
  const timeoutMs = getTimeoutMs();
  const { send, onBeforeSign, onCountdown } = options;

  onBeforeSign?.();

  let intervalId: ReturnType<typeof setInterval> | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const totalSeconds = Math.ceil(timeoutMs / 1000);
  let secondsLeft = totalSeconds;
  onCountdown?.(secondsLeft);

  intervalId = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      onCountdown?.(null);
    } else {
      onCountdown?.(secondsLeft);
    }
  }, 1000);

  const clearTimers = () => {
    if (intervalId) clearInterval(intervalId);
    if (timeoutId) clearTimeout(timeoutId);
    onCountdown?.(null);
  };

  const sendPromise = send();
  sendPromise
    .then(() => {
      if (timedOut) {
        console.warn(
          "[signature] Transaction completed after in-app timeout. Verify on block explorer before trying again; duplicate signatures can send multiple transactions.",
        );
      }
    })
    .catch(() => {});

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new SignatureTimeoutError());
      }, timeoutMs);
    });
    const result = await Promise.race([sendPromise, timeoutPromise]);
    clearTimers();
    return result as T;
  } catch (err) {
    clearTimers();
    throw err;
  }
}
