module.exports = {
  apps: [
    {
      name: "leaveapp-backend",
      cwd: "./backend",
      script: "pnpm",
      args: "start:prod",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      },
      time: true,
      watch: false
    },
    {
      name: "leaveapp-frontend",
      cwd: "./frontend",
      script: "pnpm",
      args: "start -- -p 3001",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        BACKEND_URL: "http://localhost:3000"
      },
      time: true,
      watch: false
    }
  ]
};
