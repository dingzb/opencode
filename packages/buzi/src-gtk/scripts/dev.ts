const frontend = Bun.spawn(["bun", "run", "dev:linux"], {
  cwd: new URL("../..", import.meta.url).pathname,
  stdout: "inherit",
  stderr: "inherit",
})

const stopFrontend = () => {
  frontend.kill()
}

process.on("SIGINT", () => {
  stopFrontend()
  process.exit(130)
})
process.on("SIGTERM", () => {
  stopFrontend()
  process.exit(143)
})

try {
  await waitForFrontend()
  const cargo = Bun.spawn(["cargo", "run", "--manifest-path", "src-gtk/Cargo.toml"], {
    cwd: new URL("../..", import.meta.url).pathname,
    stdout: "inherit",
    stderr: "inherit",
  })
  process.exitCode = await cargo.exited
} finally {
  stopFrontend()
}

async function waitForFrontend() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await canReachFrontend()) return
    await Bun.sleep(100)
  }
  throw new Error("Timed out waiting for Buzi frontend on http://localhost:4455")
}

async function canReachFrontend() {
  try {
    const response = await fetch("http://localhost:4455")
    return response.ok
  } catch {
    return false
  }
}
