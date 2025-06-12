const chalk = require('chalk');
const gradient = require('gradient-string');
const ora = require('ora');

const coolGradient = gradient('cyan', 'pink');
const createdByGradient = gradient('#8a2be2', '#ff69b4');

function getCurrentTime() {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
}

let spinner;

module.exports = {
    log: (message) => console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.white(message)}`),
    info: (message) => console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.blueBright.bold('INFO')} ${chalk.blueBright(message)}`),
    warn: (message) => console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.yellowBright.bold('WARN')} ${chalk.yellowBright(message)}`),
    error: (message, err) => {
        if (spinner && spinner.isSpinning) spinner.fail(chalk.redBright(message));
        else console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.redBright.bold('ERROR')} ${chalk.redBright(message)}`);
        if (err) console.error(err);
    },
    // --- THIS IS THE FUNCTION THAT WAS MISSING ---
    success: (message) => {
        console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.greenBright.bold('SUCCESS')} ${chalk.greenBright(message)}`);
    },
    command: (message) => console.log(`[${chalk.gray(getCurrentTime())}] ${coolGradient.multiline('[CMD]')} ${chalk.magentaBright(message)}`),
    stock: (message) => console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.cyan.bold('STOCK')} ${chalk.cyan(message)}`),

    start: (botName, creatorName) => {
        const title = `
      .--------------------.
      |    ${botName}    |
      '--------------------'
        `;
        const styledTitle = coolGradient.multiline(title);
        console.log(styledTitle);
        if (creatorName) {
            const credit = createdByGradient(`       ${creatorName}`);
            console.log(credit + '\n');
        }
    },

    loginStart: (message) => {
        spinner = ora({
            text: chalk.white(message),
            spinner: 'dots',
            color: 'yellow'
        }).start();
    },

    loginSuccess: () => {
        if (spinner) {
            spinner.succeed(chalk.greenBright('Login successful! Bot is now online.'));
        } else {
             console.log(`[${chalk.gray(getCurrentTime())}] ${chalk.greenBright.bold('SUCCESS')} Login successful! Bot is now online.`);
        }
    }
};