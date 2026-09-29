module.exports = {
  apps: [
    {
      name: "event-agency-api",
      cwd: "D:/Projects/event-agency/server",
      script: "D:/Projects/event-agency/node_modules/tsx/dist/cli.mjs",
      args: "src/server.ts",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "D:/Projects/event-agency/server/logs/error.log",
      out_file: "D:/Projects/event-agency/server/logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};