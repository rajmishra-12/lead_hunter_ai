const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44"
};

export const logger = {
  info: (msg, ...args) => {
    console.log(`${colors.fgCyan}[INFO] [${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`${colors.fgGreen}[SUCCESS] [${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`${colors.fgYellow}[WARN] [${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`${colors.fgRed}[ERROR] [${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`, ...args);
  },
  scraper: (source, msg, ...args) => {
    console.log(`${colors.fgMagenta}[SCRAPER:${source.toUpperCase()}] [${new Date().toLocaleTimeString()}] ${msg}${colors.reset}`, ...args);
  }
};
