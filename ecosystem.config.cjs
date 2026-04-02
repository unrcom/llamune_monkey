require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'monkey-1',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/m/dev/llamune_monkey',
      out_file: '/Users/m/dev/llamune_monkey/logs/monkey-1.log',
      error_file: '/Users/m/dev/llamune_monkey/logs/monkey-1.log',
      merge_logs: true,
      env: {
        PORT: '4000',
        PEER_URLS: process.env.MONKEY_URL_2 || '',
      },
    },
    {
      name: 'monkey-2',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/m/dev/llamune_monkey',
      out_file: '/Users/m/dev/llamune_monkey/logs/monkey-2.log',
      error_file: '/Users/m/dev/llamune_monkey/logs/monkey-2.log',
      merge_logs: true,
      env: {
        PORT: '4001',
        PEER_URLS: process.env.MONKEY_URL_1 || '',
      },
    },
  ]
}
