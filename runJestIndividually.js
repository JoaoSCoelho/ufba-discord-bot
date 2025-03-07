const fs = require('fs');
const { execSync, exec } = require('child_process');
const util = require('util');
require('ts-node').register();
const LogSystem = require('./src/classes/LogSystem.ts').default;

try {
    console.log(`Running tests that match with the pattern: ${process.argv[2] || '.'}`);
    execSync(`jest --json --findRelatedTests ${process.argv[2] || '.'} > jest-results.json`, { stdio: 'ignore' });
} catch (e) {
    console.error('Error while executing jest!\n', e);
}

let jsonFile = fs.readFileSync('./jest-results.json', { encoding: 'utf-8' });

jsonFile = jsonFile.slice(jsonFile.indexOf('{"numFailed'));
jsonFile = jsonFile.slice(0, jsonFile.indexOf('\n') + 1).trim();


const json = JSON.parse(jsonFile);
fs.writeFileSync('jest-results.json', JSON.stringify(json, null, 4));
const testNames = json.testResults.map(file => ({
    name: file.assertionResults[0].ancestorTitles[0],
    tests: file.assertionResults.map(test => ({
        prefix: test.ancestorTitles.join(' > '),
        title: test.title,
        file: file.name.replaceAll('\\', '/').replaceAll('\\\\', '/').slice(file.name.lastIndexOf('/') + 1)
    }))
}));

const logger = new LogSystem('TESTER');
const execPromise = util.promisify(exec);

async function runAllTests() {
    for (const testSuite of testNames) {
        logger.info(testSuite.name);

        if (process.env.PARALLEL === 'true') {
            const commands = [];

            for (const testName of testSuite.tests) {
                const fullTitle = testName.prefix + ' > ' + testName.title;
                logger.loading(fullTitle);
                if (process.env.PERSIST_LOGS === 'true') {
                    fs.appendFileSync('log-persistent.ansi', `\n⊢   [RUNNING] ${fullTitle}\n`);
                    fs.appendFileSync('log-persistent.txt', `\n⊢   [RUNNING] ${fullTitle}\n`);
                }
                commands.push([fullTitle, execPromise(`jest ${testName.file} --testNamePattern "${testName.title.replace('"', '\\"')}"`)]);
            }


            const results = await Promise.allSettled(commands.map((command) => command[1]));

            results.forEach((result, index) => {
                const testTitle = commands.map((command) => command[0])[index];

                if (result.status === 'fulfilled') {
                    logger.success(testTitle);
                } else {
                    throw new Error(`Erro no teste "${testTitle}" ${result.reason}`);
                }
            });
        } else {
            for (const testName of testSuite.tests) {

                const fullTitle = testName.prefix + ' > ' + testName.title;
                logger.loading(fullTitle);

                if (process.env.PERSIST_LOGS === 'true') {
                    fs.appendFileSync('log-persistent.ansi', `\n⊢   [RUNNING] ${fullTitle}\n`);
                    fs.appendFileSync('log-persistent.txt', `\n⊢   [RUNNING] ${fullTitle}\n`);
                }

                const [result] = await Promise.allSettled([execPromise(`jest ${testName.file} --testNamePattern "${testName.title.replace('"', '\\"')}"`)]);

                if (result.status === 'fulfilled') {
                    logger.success(fullTitle);
                } else {
                    throw new Error(`Erro no teste "${fullTitle}" ${result.reason}`);
                }
            }
        }



    }
}


runAllTests();