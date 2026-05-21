window.addEventListener("error", (event) => {
  console.error(
    "[brandgen-preload] window error",
    event.message,
    event.filename,
    event.lineno,
    event.colno,
    event.error?.stack,
  );
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[brandgen-preload] unhandled rejection", event.reason?.stack || event.reason);
});
