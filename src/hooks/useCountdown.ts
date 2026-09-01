import React from 'react';

type Countdown = {
  /** Whole seconds remaining. */
  secondsLeft: number;
  /** Zero-padded mm:ss, e.g. "00:28". */
  formatted: string;
  isRunning: boolean;
  /** Restarts from `seconds` (or an explicit override). */
  restart: (seconds?: number) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Drives the "Resend OTP in 00:28" timer on the verification screen. */
export default function useCountdown(
  seconds: number,
  { autoStart = true }: { autoStart?: boolean } = {},
): Countdown {
  const [secondsLeft, setSecondsLeft] = React.useState(autoStart ? seconds : 0);

  React.useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const id = setInterval(() => {
      setSecondsLeft(current => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [secondsLeft]);

  const restart = React.useCallback(
    (next?: number) => setSecondsLeft(next ?? seconds),
    [seconds],
  );

  return {
    secondsLeft,
    formatted: `${pad(Math.floor(secondsLeft / 60))}:${pad(secondsLeft % 60)}`,
    isRunning: secondsLeft > 0,
    restart,
  };
}
