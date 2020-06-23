const getUrls = require('get-urls');
const count = require('quickly-count-substrings');
const fs = require('fs');
const execa = require('execa');
const chalk = require('chalk');
const log = console.log;

let verbose = false;

let logVerbose = (m) => {
  if (!verbose) return;
  log(" " + m);
}

(async () => {
  log(chalk.yellow.bold('urlfetch'));

  var ArgumentParser = require('argparse').ArgumentParser;
  var parser = new ArgumentParser({
    addHelp: true,
    description: 'Parses each line of a file for URLs and does something with them.',
    epilog: 'Example: node app.js -i myFile.txt -x download-url (where "download-url" is a batch file)'
  });
  parser.addArgument(['-i', '--input'], { required: true, help: 'File to parse' });
  parser.addArgument(['-v', '--verbose'], { action: 'storeTrue', help: 'Print additional status' });
  parser.addArgument(['-x', '--execute'], { help: 'Command to execute for each URL' });
  parser.addArgument(['--include'], { help: 'Url parameters to include (others are excluded' });
  parser.addArgument(['--cwd'], { help: 'Working directory for execution' });
  parser.addArgument(['-a', '--appendTo'], { help: 'Appends each found url to this file' });
  parser.addArgument(['-z', '--zero'], { action: 'storeTrue', help: 'Empties the input files after execute/appendTo has run' });
  var args = parser.parseArgs();

  var urls = [];

  if (args.verbose) verbose = true; // important to have first

  // Read input
  if (args.input) urls = await handleFile(args.input);


  // Remove params
  if (args.include || args.exclude) {
    let include = args.include ? args.include.split(',') : [];
    let exclude = args.exclude ? args.exclude.split(',') : [];
    urls = urls.map(u => {
      let url = new URL(u);
      let keys = Array.from(url.searchParams.keys());
      keys.forEach((name) => {
        // Remove params that are not in include list, if include list is specified
        if (include.length > 0) {
          if (include.indexOf(name) < 0) {
            url.searchParams.delete(name);
          }
        }

        // Remove params listed in exclude list
        if (exclude.indexOf(name) >= 0) {
          url.searchParams.delete(name);
        }
      });

      
      
      if (verbose) {
        console.log(u + " -> " + url.toString());
      }
      return url.toString();
    });
  }
  // Execute something per url
  if (args.execute) await executeUrls(urls, args);

  // Append URLs to another file
  if (args.appendTo) await appendUrls(urls, args.appendTo);

  // Warn if nothing happened
  if (!args.execute && !args.appendTo) {
    log(chalk.red('Nothing done with urls, consider using --execute or --appendTo'));
  } else if (args.zero) {
    // Empty file if requested
    log('--zero option used, emptying the input file');
    fs.writeFileSync(args.input, '');
  }

})();

async function appendUrls(urls, dest) {
  let p = new Promise((resolve, reject) => {
    if (urls.length == 0) {
      log('Append: No URLs found.');
      resolve();
      return;
    }
    var f = fs.createWriteStream(dest, { flags: 'a' });
    urls.forEach(u => {
      f.write(u);
      f.write('\r\n');
    });
    f.end();
    resolve();

  });
}

async function executeUrls(urls, args) {
  if (args.cwd) logVerbose('Execution working directory: ' + args.cwd);
  let total = urls.length;

  let p = new Promise((resolve, reject) => {
    if (total == 0) {
      log('Execute: No URLs found.');
      resolve();
      return;
    }
    let index = 1;
    urls.forEach(u => {
      executeUrl(u, args, index++, total);

    });
    resolve();
  });
}

async function executeUrl(url, args, index, total) {
  const what = args.execute + ' ' + url;
  let execArgs = {};
  if (args.cwd) execArgs.cwd = args.cwd;
  logVerbose("Executing " + index + "/" + total + ": " + what);
  try {
    let results = execa.shellSync(what, execArgs);
    if (results.error) {
      log(chalk.red(results.error));
    } else {
      logVerbose(chalk.gray(results.stdout));
    }
    return results;
  } catch (e) {
    log(chalk.red(e));
  }
}

async function handleFile(file) {
  logVerbose('Reading: ' + file);
  let urls = new Set();
  let p = new Promise((resolve, reject) => {
    var lineReader = require('readline').createInterface({
      input: require('fs').createReadStream(file)
    });

    lineReader.on('line', function (line) {
      // Do a rough check to see if it's
      // one line of Markdown syntax: [text](url)
      // this is necessary since getUrls otherwise includes the trailing )
      console.log(line);
      if (line.charAt(0) == '[' && line.charAt(line.length - 1) == ')') {
        // Ok, starts and ends the way we expect

        var textClose = line.lastIndexOf(']');
        var urlStart = line.lastIndexOf('(');
        if (urlStart= textClose+1) {
          // Looks alright
          urlStart++;
          line = line.substring(urlStart, line.length-1);
        }
        // if (count(line, '[') == 1 && count(line, ']') == 1 && count(line, ')') == 1 && count(line, '(') == 1) {
        //   // Only strip away if it's the simple case
        //   console.log(' Removing parenth');
        //   line = line.replace(')', ' ');
        //   line = line.replace('(', ' ');
        // }

      }
      getUrls(line).forEach(u => {
        logVerbose("Found: " + u);
        urls.add(u)
      });

    });

    lineReader.on('close', function () {
      resolve(Array.from(urls));
    })
  });
  return p;
}
