var path = require('path')
var fs = require('fs')
var exec = require('child_process').exec;

var walk = function(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            /* Recurse into a subdirectory */
            results = results.concat(walk(file));
        } else {
            /* Is a file */
            results.push(file);
        }
    });
    return results;
}

const args = {};
const patterns = {
	"--web": (index, array) => {
		args["web"] = array[index + 1];
	}
}

process.argv.forEach(function (val, index, array) {
	// console.log(index + ': ' + val, array);
	if (patterns.hasOwnProperty(val)) {
		patterns[val](index, array);
	}
});

if (!args.hasOwnProperty("web")) {
	console.error("[ERROR] - can't build nextjs folders without having it's path!");
	process.exit(0);
}

if (args["web"][0] == ".") {
	args["web"] = args["web"].substring(1, args["web"].length);
}


const path_executed_script = process.cwd() + args["web"];

// console.log("Arguments", args);
// console.log("Root project is", path_executed_script)

//	seraching for .babelrc.js files then execute backward the nextjs build command from main node_modules
ext_file_list = walk(path_executed_script).filter((obj) => obj.indexOf(".babelrc.js") > -1).map((obj) => path.dirname(obj));


const commands = [];

//	Count the backward jump of folder to get node_modules
ext_file_list.map((path) => {
	// console.log(process.cwd().split("/").length, path.split("/").length);
	var difference_jumps = path.split("/").length - process.cwd().split("/").length;
	var nextjs_relative = "";
	for (var i = 0; i < difference_jumps; i++) {
		nextjs_relative += "../";
	}
	nextjs_relative += "node_modules/next/dist/bin/next build";
	var final_command = `cd ${path} && ${nextjs_relative}`;
	commands.push(final_command);
})

commands.map((cmd) => {
	exec(cmd, function(err, stdout, stderr) {
		if (err) {
			console.error("[ERROR] - Failed to build nextjs project", stderr)
		// should have err.code here?
		} else {
			console.log("[SUCCESS] - NextJs project builded", stdout);
		}
	});
})

// console.log("paths", ext_file_list);
// console.log("commands", commands);
