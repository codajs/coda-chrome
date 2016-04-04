var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

/**
 *
 */
function plugin(context) {
  context.spawn.commands['chrome'] = function(command, args, options) {
    var port = options.port;

    var dirname = {
      darwin: function(env) {
        var prefix = env['HOME'];
        var suffix = path.join('Library/Application Support/Google/Chrome', '' + port);

        return path.join(prefix, suffix);
      },

      linux: function(env) {
        var prefix = env['XDG_CONFIG_HOME'] || path.join(env['HOME'], '.config');
        var suffix = path.join('google-chrome', '' + port);

        return path.join(prefix, suffix);
      },

      win32: function(env) {
        var prefix = env['LOCALAPPDATA'];
        var suffix = path.join('Google\\Chrome\\User Data', '' + port);

        return path.join(prefix, suffix);
      },
    }[process.platform];

    args.push('--remote-debugging-port=' + port);
    args.push('--user-data-dir=' + dirname(process.env));

    var match = /^chrome-(.*)/.exec(command);
    if (match) {
      var version = match[1];
    }

    return spawn(version, args, options);
  };
}

module.exports = plugin;

/**
 *
 */
function spawn(version, args, options) {
  var searches = [
    'which Google\ Chrome',
    path.join('/Applications', process.env['HOME'] || '', '/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'),
    path.join('/Applications', '/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'),

    'which google-chrome',
    'which google-chrome-beta',
    'which google-chrome-unstable',
    path.join('/usr/bin', 'google-chrome'),
    path.join('/usr/bin', 'google-chrome-beta'),
    path.join('/usr/bin', 'google-chrome-unstable'),

    'where chrome.exe',
    'which chrome.exe',
    path.join(process.env['LocalAppData'] || '', '\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES'] || '', '\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)']|| '', '\\Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['LOCALAPPDATA'] || '', '\\Google\\Chrome\ SxS\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES'] || '', '\\Google\\Chrome\ SxS\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)']|| '', '\\Google\\Chrome\ SxS\\Application\\chrome.exe'),
  ];

  var commands = searches.reduce(function(commands, search) {
    if (path.isAbsolute(search) && fs.existsSync(search)) {
      return commands.concat(search);
    }

    try {
      var result = child_process.execSync(search, {
        stdio: 'ignore',
        encoding: 'utf-8',
      });

      if (result) {
        return commands.concat(result.split('\n'));
      }
    } catch (error) {}

    return commands;
  }, []).filter(function(command, index, commands) {
    return commands.indexOf(command) == index;
  });

  var matches = commands.filter(function(command) {
    if (version === undefined) {
      return true;
    }

    if (/google-chrome/.test(command)) {
      if (/(stable)/.test(version)) {
        return /google-chrome$/.test(command);
      }

      if (/beta/.test(version)) {
        return /google-chrome-beta$/.test(command);
      }

      if (/unstable/.test(version)) {
        return /google-chrome-unstable$/.test(command);
      }
    }

    if (/Chrome/.test(command)) {
      if (/(stable)/.test(version)) {
        return /Google\ Chrome$/.test(command);
      }

      if (/canary/.test(version)) {
        return /Chrome Canary$/.test(command);
      }
    }

    if (/chrome.exe/.test(command)) {
      if (/(stable)/.test(version)) {
        return /Chrome\\Application\\chrome.exe$/.test(command);
      }

      if (/canary/.test(version)) {
        return /Chrome\ SxS\\Application\\chrome.exe$/.test(command);
      }
    }
  });

  if (matches.length < 1) {
    throw new Error('Could not find chrome executable');
  }

  args = [
    '--disable-default-apps',
    '--disable-restore-session-state',
    '--disable-sync',
    '--no-default-browser-check',
    '--no-first-run',
  ].concat(args);

  return child_process.spawn(matches[0], args, options);
}

module.exports.spawn = spawn;
