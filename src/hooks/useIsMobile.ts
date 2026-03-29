import { useState } from 'react';

const MOBILE_USER_AGENT_PATTERNS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /IEMobile/i,
  /Opera Mini/i,
  /Mobile/i,
  /Windows Phone/i
];

function checkIsMobile (): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const userAgent = window.navigator.userAgent;
  return MOBILE_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function useIsMobile (): boolean {
  const [isMobile] = useState<boolean>(checkIsMobile);
  return isMobile;
}
