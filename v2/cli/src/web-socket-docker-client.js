var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var msgcode = {
  // stream related message types (carries a payload)
  stdin: 0,
  stdout: 1,
  stderr: 2,
  //special message type (carries a payload)
  resize: 50,
  // data-flow related message types (carries no payload)
  resume: 100, // Process is now ready to receive data
  pause: 101, // Process is processing current data, don't send more right now
  end: 102, //Indicates end of stream
  // resolution related message types
  stopped: 200, // Process exited, payload is single byte exit code
  shutdown: 201, // Server shut down
  error: 202 // Some internal error occurred, expect undefined behaviour
  //may carry utf8 payload regarding error reason
}
var querystring = require('querystring');
var through2 = require('through2').obj;
var WS = require('ws');

var BROWSER = typeof window === 'undefined';

class DockerExecWebsocketClient extends EventEmitter {
  constructor(options) {
    super();
    let _headers = options.headers
    this.options = {
      tty: options.tty,
      command: options.command,
      wsopts: options.headers,
      ...options,
    };
  }

  /* Makes a client program with unbroken stdin, stdout, stderr streams
   * Is also an EventEmitter with 'exit' event
   *
   * Required options:
   * url parts (hostname port pathname)
   * or url
   * tty: whether or not we expect VT100 style output
   * command: array or string of command to be run in exec
   */
  async execute() {
    this.url = this.options.url + '?' + querystring.stringify({
      tty: this.options.tty ? 'true' : 'false',
      command: this.options.command,
      container: this.options.container,
      containername: this.options.containername,
      group: this.options.group,
      node: this.options.node,
      token: this.options.token
    });
    //debug(this.url);
    assert(/ws?s:\/\//.test(this.url), 'url required or malformed url input');

    //HACK: browser check
    if (BROWSER) { //means that this is probably node
      this.socket = new WS(this.url, this.options.wsopts);
      //console.log(this.options.wsopts)
    } else { //means this is probably a browser, which means we ignore options
      this.socket = new WebSocket(this.url);
    }

    this.socket.binaryType = 'arraybuffer';
    this.socket.addEventListener('open', () => {
      //debug('socket opened');
      this.emit('open');
    });

    this.stdin = through2((data, enc, cb) => {
      this.sendMessage(msgcode.stdin, data)
      cb()
    }, (cb) => {
      this.sendCode(msgcode.end)
      cb()
    })

    const MAX_OUTSTANDING_BYTES = 8 * 1024 * 1024;
    this.outstandingBytes = 0;

    //stream with pause buffering, everything passes thru here first
    this.strbuf = through2();
    this.strbuf.on('data', (data) => {
      this.outstandingBytes += data.length;
      //debug(this.outstandingBytes);
      if (BROWSER) {
        this.socket.send(data, {binary: true}, () => {
          this.outstandingBytes -= data.length;
          //debug(this.outstandingBytes);
        });
      } else {
        this.socket.send(data);
        this.outstandingBytes -= data.length;
        //debug(this.outstandingBytes);
      }
      if (this.outstandingBytes > MAX_OUTSTANDING_BYTES) {
        this.strbuf.pause();
        this.emit('paused');
        //debug('paused');
      } else {
        this.strbuf.resume();
        this.emit('resumed');
        //debug('resumed');
      }
    });
    //Starts out paused so that input isn't sent until server is ready
    this.strbuf.pause();

    this.stdout = through2();
    this.stderr = through2();
    this.stdout.draining = false;
    this.stderr.draining = false;

    this.stdout.on('drain', () => {
      this.stdout.draining = false;
      if (!this.stderr.draining) {
        this.sendCode(msgcode.resume);
      }
    });

    this.stderr.on('drain', () => {
      this.stderr.draining = false;
      if (!this.stdout.draining) {
        this.sendCode(msgcode.resume);
      }
    });

    this.socket.onmessage = (messageEvent) => {
      this.messageHandler(messageEvent);
    };
    await new Promise((accept, reject) => {
      this.socket.addEventListener('error', reject);
      this.socket.addEventListener('open', accept);
    });
    this.socket.addEventListener('error', err => this.emit('error', err));
    //debug('client connected');
  }

  messageHandler(messageEvent) {
    var message = Buffer.from(new Uint8Array(messageEvent.data));
    //debugdata(message);
    // the first byte is the message code
    switch (message[0]) {
      //pauses the client, causing strbuf to buffer
      case msgcode.pause:
        this.strbuf.pause();
        this.emit('paused');
        //debug('paused');
        break;

      //resumes the client, flushing strbuf
      case msgcode.resume:
        this.strbuf.resume();
        this.emit('resumed');
        //debug('resumed');
        break;

      case msgcode.stdout:
        if (!this.stdout.write(message.slice(1))) {
          this.sendCode(msgcode.pause);
          this.stdout.draining = true;
        }
        break;

      case msgcode.stderr:
        if (!this.stderr.write(message.slice(1))) {
          this.sendCode(msgcode.pause);
          this.stderr.draining = true;
        }
        break;

      //first byte contains exit code
      case msgcode.stopped:
        this.emit('exit', message.readInt8(1));
        this.close();
        break;

      case msgcode.shutdown:
        this.emit('shutdown');
        //debug('server has shut down');
        this.close();
        break;

      case msgcode.error:
        this.emit('error', message.slice(1));
        break;

      default:
        //debug('unknown msg code %s', message[0]);
    }
  }

  resize(h, w) {
    if (!this.options.tty) {
      throw new Error('cannot resize, not a tty instance');
    } else {
      var buf = Buffer.alloc(4);
      buf.writeUInt16LE(h, 0);
      buf.writeUInt16LE(w, 2);
      //debug('resized to %sx%s', h, w);
      this.sendMessage(msgcode.resize, buf);
    }
  }

  sendCode(code) {
    this.strbuf.write(Buffer.from([code]));
  }

  sendMessage(code, data) {
    this.strbuf.write(Buffer.concat([Buffer.from([code]), Buffer.from(data)]));
  }

  close() {
    if (!this.strbuf.paused) {
      this.socket.close();
      this.stdin.end();
      this.stdout.end();
      this.stderr.end();
      this.strbuf.end();
    } else {
      this.strbuf.on('drain', () => {
        this.socket.close();
        this.stdin.end();
        this.stdout.end();
        this.stderr.end();
        this.strbuf.end();
      });
    }
  }
}

module.exports = DockerExecWebsocketClient;
