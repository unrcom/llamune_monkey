module.exports = {
  apps: [{
    name: 'llamune_monkey',
    script: 'npm',
    args: 'run dev',
    cwd: '/Users/m/dev/llamune_monkey',
    out_file: '/Users/m/dev/llamune_monkey/logs/monkey.log',
    error_file: '/Users/m/dev/llamune_monkey/logs/monkey-error.log',
    merge_logs: true,
  }]
}
