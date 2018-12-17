# urlfetch

A command line tool to process URLs found in a file line by line. It can extract multiple URLs per line, and any additional text is ignored.

Motivation: Digging for old music via blogs and YouTube. I set up Microsoft Flow to grab URLs I post to the Todoist app and append them to a file in Dropbox. Once there, I have a scheduled task periodically run urlfetch on this file to grab the linked files via youtube-dl or wget. I have a few different projects set up in Todoist, which each feed into different text files on Dropbox, and later, get processed by urlfetch with different parameters.

## Install

`npm install`

## Basic usage

```
node app.js --input [input file] --execute [command to run for each url]
```

## Usage: Run a command for each url

Reads input.txt, executing a command 'batch' for each URL:

```
node app.js --input input.txt --execute batch
```

This means if input.txt contains URLs A, B and C, urlfetch would execute:

```
batch A
batch B
batch C
```

No special escaping or enclosing of URLs is performed. In this case, 'batch' is assumed to be a command available in the current working directory or global scope (eg in your path).

Add the flag `--verbose` if you care to see the output of the execution.

Additional options:

--cwd: Set the current working directory when executing the command

Example:

```
node app.js --input input.txt --execute batch --cwd c:\somepath
```

## Usage: Collect URLs from input file

Read input.txt, appending each found URL to output.txt. Essentially, it strips away everything from the input that is not a URL.

```
node app.js --input input.txt --appendTo output.txt
```

Each URL is appended on its own line, and the output file is created if it doesn't exist. There is no checking for duplicate URLs, so the output file might accrue duplicates.

## Flags

--verbose: Print out info on what it's doing

--zero: Empties the contents of the input file after processing. Use with caution: This will be performed regardless of whether executions were successful.

Flag usage example:

```
node app.js --input input.txt --appendTo output.txt --zero --verbose
```









