export function detectExamGuardPlatform(navigatorValue = globalThis.navigator) {
  const platform = [
    navigatorValue?.userAgentData?.platform,
    navigatorValue?.platform,
    navigatorValue?.userAgent,
  ].filter(Boolean).join(" ").toLowerCase();
  if (/windows|win32|win64/.test(platform)) return "windows";
  if (/mac|darwin/.test(platform)) return "macos";
  if (/linux|x11/.test(platform)) return "linux";
  return null;
}
