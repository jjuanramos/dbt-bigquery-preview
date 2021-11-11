const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { stderr } = require('process');

// function executeCommand(cmd) {

// 	new Promise((resolve, reject) => {
//         child_process.exec(cmd, (err, out) => {
// 			if (err) {
// 				return resolve(cmd+' error!');
// 				//or,  reject(err);
// 			}
// 			return resolve(out);
// 		});
// 	});
// }

//... show powershell output from 'pwd'...
// context.subscriptions.push(
// vscode.commands.registerCommand('test', async () => {
//     const output = await execShell('powershell pwd');
//     vscode.window.showInformationMessage(output);
// })
// );

async function executeCommand(cmd) {
    const { stdout, stderr } = await exec(cmd);
    console.log('stdout:', stdout);
    console.error('stderr:', stderr);
}

(async () => {
    const result = await executeCommand("dbt --version");
    console.log(result);
})()