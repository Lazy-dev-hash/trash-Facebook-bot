const chalk = require('chalk');
const ora = require('ora');
const logSymbols = require('log-symbols');

const logger = {
  info(msg) {
    console.log(`${chalk.blueBright(logSymbols.info)} ${msg}`);
  },
  success(msg) {
    console.log(`${chalk.green(logSymbols.success)} ${msg}`);
  },
  warn(msg) {
    console.log(`${chalk.yellow(logSymbols.warning)} ${msg}`);
  },
  error(msg) {
    const errorMsg = msg instanceof Error ? msg.message : msg;
    console.log(`${chalk.red(logSymbols.error)} ${chalk.red.bold(errorMsg)}`);
    if (msg instanceof Error && msg.stack) {
      console.log(chalk.gray(msg.stack.substring(msg.stack.indexOf("\n") + 1)));
    }
  },
  spinner(text) {
    return ora({ text, spinner: 'dots', color: 'cyan' });
  }
};

module.exports = logger;
