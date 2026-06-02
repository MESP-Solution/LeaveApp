module.exports = {
  apps: [
    {
      name: "leaveapp-backend",
      cwd: "/home/mespcenter-leaveapp/htdocs/leaveapp.mespcenter.com/backend",
      script: "pnpm",
      args: "run start",
      interpreter: "none",
      env: {
      NODE_ENV: "production",
      PORT: 1339
      }
    },
    {
      name: "leaveapp-frontend",
      cwd: "/home/mespcenter-leaveapp/htdocs/leaveapp.mespcenter.com/frontend",
      script: "pnpm",
      args: "run start",
      interpreter: "none",
      env: {
      NODE_ENV: "production",
      PORT: 3002
      }
    }
  ]
};
