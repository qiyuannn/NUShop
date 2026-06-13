export function formatMessageTime(timestamp: string) {
  const date = new Date(timestamp);

  // Singapore time
  const sgDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" }));

  const isToday =
    sgDate.getFullYear() === today.getFullYear() &&
    sgDate.getMonth() === today.getMonth() &&
    sgDate.getDate() === today.getDate();

  if (isToday) {
    return sgDate.toLocaleTimeString("en-SG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return sgDate.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
