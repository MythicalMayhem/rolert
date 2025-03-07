const os = require('os')
const path = require("path");
const { exec } = require('child_process')

const isWindows = os.platform() === "win32"
const scriptPath = path.resolve(".", "scripts/bin/windows/prepublish.bat")

function execute(command) {

	exec(command, (err, stdout, stderr) => {
		if(err) {
			console.error(`Error: ${err.message}`);
			return;
		}
		console.log(stdout);
	});
}


// console.clear()
if(isWindows) execute(path.resolve(scriptPath))
 

