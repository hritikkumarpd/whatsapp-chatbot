// Safety hooks to ensure background daemon never crashes on unhandled promises or socket hiccups
process.on('uncaughtException', (err) => {
  console.error('⚠️ [UncaughtException Safeguard]:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [UnhandledRejection Safeguard]:', reason?.message || reason);
});
