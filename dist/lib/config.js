"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _defaultConfig = _interopRequireDefault(require("./defaultConfig"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const keys = Object.keys(_defaultConfig.default);
const config = loadConfig();
for (let key of keys) {
  config[key] = config[key] || _defaultConfig.default[key];
  for (let p in _defaultConfig.default[key]) {
    if (undefined === config[key][p]) config[key][p] = _defaultConfig.default[key][p];
  }
}

// enable undefined modules
for (let module in _defaultConfig.default.api.modules) {
  config.api.modules[module] = config.api.modules[module] !== false;
}

// defaults  servers/ports

config.blocks.node = config.blocks.node || config.source.node;
config.blocks.port = config.blocks.port || config.source.port;

let s = config.source;
config.source.url = config.source.url || `${s.protocol}://${s.node}:${s.port}`;

// defaults log files

defaultLogs('api');
defaultLogs('blocks');

config.api.collectionsNames = config.collectionsNames;

function defaultLogs(key) {
  const dir = config.log.dir;
  if (!dir) return;
  config[key].log = config[key].log || {};
  config[key].log.file = config[key].log.file || `${dir}/${key}.json`;
  config[key].log.level = config[key].log.level || config.log.level || 'info';
}

function loadConfig() {
  let config = {};
  try {
    let file = _path.default.resolve(__dirname, '../../config.json');
    if (_fs.default.existsSync(file)) config = JSON.parse(_fs.default.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.log(err);
    process.exit(8);
  }
  return config;
}var _default =

config;exports.default = _default;