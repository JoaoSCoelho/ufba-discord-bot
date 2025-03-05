const fs = require('fs');
const { execSync } = require('child_process');


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
    tests: file.assertionResults.map(test =>
        [test.ancestorTitles.join(' > '), test.title]
    )
}));
console.log(testNames, testNames.length);

async function runAllTests() {
    for (const testSuite of testNames) {
        console.info(testSuite.name);

        for (const testName of testSuite.tests) {
            console.log('⊢   [RUNNING] ' + testName.join(' > '));

            if (process.env.PERSIST_LOGS === 'true') {
                fs.appendFileSync('log-persistent.ansi', `\n⊢   [RUNNING] ${testName.join(' > ')}\n`);
                fs.appendFileSync('log-persistent.txt', `\n⊢   [RUNNING] ${testName.join(' > ')}\n`);
            }

            try {
                execSync(`jest --testNamePattern "${testName[1].replace('"', '\\"')}"`, { stdio: 'inherit' });
                console.log('⊢   [SUCCESS] ' + testName.join(' > '));
            } catch (e) {
                console.error(`Erro no teste "${testName.join(' > ')}"`, e);
            }
        }

    }
}

runAllTests();