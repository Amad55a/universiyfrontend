const TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PREFERRED_PROTOCOL = "unicore-exam://launch";

export function createExamGuardProtocolUrl(ticket) {
  if (typeof ticket !== "string" || !TICKET_PATTERN.test(ticket)) {
    throw new Error("UniCORE returned an invalid launch ticket.");
  }
  return `${PREFERRED_PROTOCOL}?ticket=${encodeURIComponent(ticket)}`;
}

export function openExamGuard(ticket, openUrl = (url) => window.location.assign(url)) {
  openUrl(createExamGuardProtocolUrl(ticket));
}
