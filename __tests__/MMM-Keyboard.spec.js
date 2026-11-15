/** @jest-environment jsdom */

const fs = require('node:fs');

require('../__mocks__/Module');
require('../__mocks__/globalLogger');

const name = 'MMM-Keyboard';
const shiftStateNormal = 0;
const shiftStateShift = 1;
const shiftStateCapsLock = 2;

let MMMKeyboard;
let oldLog;

beforeEach(() => {
  jest.resetModules();
  require('../MMM-Keyboard');

  MMMKeyboard = global.Module.create(name);
  MMMKeyboard.setData({ name, identifier: `Module_1_${name}` });
  oldLog = MMMKeyboard.log;
  MMMKeyboard.log = jest.fn();
  MMMKeyboard.keyboard = {
    value: '',
    setOptions: jest.fn(),
    getInput: jest.fn().mockImplementation(() => MMMKeyboard.keyboard.value),
    setInput: jest.fn().mockImplementation(
      (value) => MMMKeyboard.keyboard.value = value,
    ),
    clearInput: jest.fn(),
    options: {
      layoutName: 'default',
    },
  };
});

afterEach(() => {
  MMMKeyboard.log = oldLog;
  document.getElementsByTagName('html')[0].innerHTML = '';
});

describe('defaults', () => {
  it('has a default config', () => {
    expect(MMMKeyboard.defaults).toEqual({
      alwaysShow: false,
      layout: 'default',
      sendLabel: 'SEND!',
      hideLabel: '\u21e7',
      language: 'en',
      startUppercase: true,
      startWithNumbers: false,
      theme: 'default',
      debug: false,
    });
  });

  it('uses the config language override when set', () => {
    const previousConfig = global.config;
    global.config = { language: 'de' };

    jest.resetModules();
    require('../MMM-Keyboard');
    MMMKeyboard = global.Module.create(name);
    MMMKeyboard.setData({ name, identifier: `Module_1_${name}` });

    expect(MMMKeyboard.defaults.language).toBe('de');
    global.config = previousConfig;
  });
});

describe('getStyles', () => {
  it('returns the correct styles', () => {
    expect(MMMKeyboard.getStyles()).toEqual([
      'keyboard.css',
      'node_modules/simple-keyboard/build/css/index.css',
    ]);
  });
});

describe('getScripts', () => {
  it('returns the correct scripts', () => {
    expect(MMMKeyboard.getScripts()).toEqual([
      'node_modules/simple-keyboard/build/index.js',
    ]);
  });
});

describe('start', () => {
  beforeEach(() => {
    MMMKeyboard.loadLayouts = jest.fn();
  });

  it('sets shiftState to shift if starting uppercase', () => {
    MMMKeyboard.config.startUppercase = true;

    MMMKeyboard.start();

    expect(MMMKeyboard.shiftState).toBe(shiftStateShift);
  });

  it('sets shiftState to normal if not starting uppercase', () => {
    MMMKeyboard.config.startUppercase = false;

    MMMKeyboard.start();

    expect(MMMKeyboard.shiftState).toBe(shiftStateNormal);
  });

  it('will allow setting language to de', () => {
    MMMKeyboard.config.language = 'de';

    MMMKeyboard.start();

    expect(MMMKeyboard.config.language).toBe('de');
  });

  it('will allow setting language to en', () => {
    MMMKeyboard.config.language = 'en';

    MMMKeyboard.start();

    expect(MMMKeyboard.config.language).toBe('en');
  });

  it('will revert all other languages to en', () => {
    MMMKeyboard.config.language = 'fr';

    MMMKeyboard.start();

    expect(MMMKeyboard.config.language).toBe('en');
  });

  it('loads layouts', () => {
    MMMKeyboard.start();

    expect(MMMKeyboard.loadLayouts).toHaveBeenCalled();
  });
});

describe('loadLayouts', () => {
  it('loads the layouts into memory', async () => {
    const responseText = fs.readFileSync(require.resolve('../layouts.json'), 'utf8');
    const xhr = {
      readyState: 0,
      status: 0,
      responseText: '',
      overrideMimeType: jest.fn(),
      open: jest.fn(),
      send: jest.fn(),
    };
    global.XMLHttpRequest = jest.fn(() => xhr);
    MMMKeyboard.buildKeyboard = jest.fn();

    MMMKeyboard.loadLayouts();

    expect(xhr.open).toHaveBeenCalledWith('GET', 'layouts.json', true);
    expect(xhr.send).toHaveBeenCalledWith(null);

    xhr.readyState = 4;
    xhr.status = 200;
    xhr.responseText = responseText;
    xhr.onreadystatechange();

    await Promise.resolve();

    expect(MMMKeyboard.layouts).toMatchSnapshot();
    expect(MMMKeyboard.buildKeyboard).toHaveBeenCalled();
  });
});

describe('getDom', () => {
  it('returns the generated dom', () => {
    expect(MMMKeyboard.getDom()).toMatchSnapshot();
  });

  it('can generate a dom for debug', () => {
    MMMKeyboard.config.debug = true;

    expect(MMMKeyboard.getDom()).toMatchSnapshot();
  });

  describe('submit button', () => {
    it('defaults to SEND!', () => {
      expect(MMMKeyboard.getDom().querySelector('.sendButton').innerText.trim())
        .toBe('SEND!');
    });

    it('can be overridden with config value', () => {
      MMMKeyboard.config.sendLabel = 'Submit';

      expect(MMMKeyboard.getDom().querySelector('.sendButton').innerText.trim())
        .toBe('Submit');
    });
  });

  describe('hide button', () => {
    it('defaults to up arrow', () => {
      expect(MMMKeyboard.getDom().querySelector('.hideButton').innerText.trim())
        .toBe('\u21e7');
    });

    it('can be overridden with config value', () => {
      MMMKeyboard.config.hideLabel = 'Close';

      expect(MMMKeyboard.getDom().querySelector('.hideButton').innerText.trim())
        .toBe('Close');
    });
  });

  it('will launch showing with alwaysShow', () => {
    MMMKeyboard.config.alwaysShow = true;

    MMMKeyboard.getDom();

    expect(MMMKeyboard.kbContainer.classList).toContain('show-keyboard');
  });
});

describe('notificationReceived', () => {
  it('logs a message for `DOM_OBJECTS_CREATED`', () => {
    MMMKeyboard.notificationReceived('DOM_OBJECTS_CREATED');

    expect(MMMKeyboard.log)
      .toHaveBeenCalledWith('MMM-Keyboard: Initializing keyboard');
  });

  describe('KEYBOARD', () => {
    it('activates keyboard', () => {
      document.body.appendChild(MMMKeyboard.getDom());

      MMMKeyboard.notificationReceived('KEYBOARD', {
        key: 'test-key',
        style: 'default',
        data: {
          test: 'data',
          foo: 'bar',
        },
      });

      expect(MMMKeyboard.log)
        .toHaveBeenCalledWith('MMM-Keyboard recognized a notification: KEYBOARD{"key":"test-key","style":"default","data":{"test":"data","foo":"bar"}}');
      expect(MMMKeyboard.log)
        .toHaveBeenCalledWith('Activating Keyboard!');
      expect(MMMKeyboard.current.key).toBe('test-key');
      expect(MMMKeyboard.current.data).toEqual({
        test: 'data',
        foo: 'bar',
      });
      expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
        layoutName: 'shift',
      });
      expect(document.getElementById('kbInput').value)
        .toBe('');
    });

    it('sets layout shift if default and startUppercase', () => {
      document.body.appendChild(MMMKeyboard.getDom());
      MMMKeyboard.config.startUppercase = true;

      MMMKeyboard.notificationReceived('KEYBOARD', {
        key: 'test-key',
        style: 'default',
      });

      expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
        layoutName: 'shift',
      });
    });

    it('sets layout default if default and not startUppercase', () => {
      document.body.appendChild(MMMKeyboard.getDom());
      MMMKeyboard.config.startUppercase = false;

      MMMKeyboard.notificationReceived('KEYBOARD', {
        key: 'test-key',
        style: 'default',
      });

      expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
        layoutName: 'default',
      });
    });

    it('sets layout numbers if numbers specified', () => {
      document.body.appendChild(MMMKeyboard.getDom());

      MMMKeyboard.notificationReceived('KEYBOARD', {
        key: 'test-key',
        style: 'numbers',
      });

      expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
        layoutName: 'numbers',
      });
    });

    it('sets layout default if default, startUppercase, but value specified', () => {
      document.body.appendChild(MMMKeyboard.getDom());
      MMMKeyboard.config.startUppercase = true;

      MMMKeyboard.notificationReceived('KEYBOARD', {
        key: 'test-key',
        style: 'default',
        value: 'old value',
      });

      expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
        layoutName: 'default',
      });
    });
  });
});

describe('sendInput', () => {
  it('sends KEYBOARD_INPUT with message', () => {
    MMMKeyboard.sendNotification = jest.fn();
    MMMKeyboard.current = {
      key: 'test-key',
      data: { foo: 'bar' },
    };

    document.body.appendChild(MMMKeyboard.getDom());
    document.getElementById('kbInput').value = 'User input';

    MMMKeyboard.kbContainer.classList.add('show-keyboard');

    MMMKeyboard.sendInput();

    expect(MMMKeyboard.sendNotification)
      .toHaveBeenCalledWith('KEYBOARD_INPUT', {
        key: 'test-key',
        message: 'User input',
        data: {
          foo: 'bar',
        },
      });
    expect(MMMKeyboard.keyboard.clearInput).toHaveBeenCalled();
    expect(document.getElementById('kbInput').value).toBe('');
    expect(MMMKeyboard.shiftState).toBe(shiftStateShift);
    expect(MMMKeyboard.kbContainer.classList)
      .not.toContain('show-keyboard');
  });

  it('does not include extraneous parameters', () => {
    MMMKeyboard.sendNotification = jest.fn();
    MMMKeyboard.current = {
      key: 'test-key',
      data: { foo: 'bar' },
      sendLabel: 'senddddd',
      value: 'old value',
    };

    document.body.appendChild(MMMKeyboard.getDom());
    document.getElementById('kbInput').value = 'User input';

    MMMKeyboard.kbContainer.classList.add('show-keyboard');

    MMMKeyboard.sendInput();

    expect(MMMKeyboard.sendNotification)
      .toHaveBeenCalledWith('KEYBOARD_INPUT', {
        key: 'test-key',
        message: 'User input',
        data: {foo: 'bar'},
      });
  });
});

describe('onChange', () => {
  it('sets kbInput value', () => {
    document.body.appendChild(MMMKeyboard.getDom());

    MMMKeyboard.onChange('new value');

    expect(document.getElementById('kbInput').value).toBe('new value');
    expect(MMMKeyboard.log).toHaveBeenCalledWith('Input changed: new value');
  });

  it('sets shift state if input is empty', () => {
    const oldHandleShift = MMMKeyboard.handleShift;
    MMMKeyboard.handleShift = jest.fn();
    document.body.appendChild(MMMKeyboard.getDom());

    MMMKeyboard.onChange('');

    expect(MMMKeyboard.shiftState).toBe(shiftStateShift);
    expect(MMMKeyboard.handleShift).toHaveBeenCalled();

    MMMKeyboard.handleShift = oldHandleShift;
  });
});

describe('onKeyPress', () => {
  let oldHandleShift;
  let oldHandleNumbers;

  beforeEach(() => {
    oldHandleShift = MMMKeyboard.handleShift;
    oldHandleNumbers = MMMKeyboard.handleNumbers;
    MMMKeyboard.handleShift = jest.fn();
    MMMKeyboard.handleNumbers = jest.fn();
  });

  afterEach(() => {
    MMMKeyboard.handleShift = oldHandleShift;
    MMMKeyboard.handleNumbers = oldHandleNumbers;
  });

  describe('{shift}', () => {
    it('sets shiftState to shift from normal', () => {
      MMMKeyboard.shiftState = shiftStateNormal;

      MMMKeyboard.onKeyPress('{shift}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateShift);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{shift}');
    });

    it('sets shiftState to caps lock from shift', () => {
      MMMKeyboard.shiftState = shiftStateShift;

      MMMKeyboard.onKeyPress('{shift}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateCapsLock);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{shift}');
    });

    it('sets shiftState to normal from caps lock', () => {
      MMMKeyboard.shiftState = shiftStateCapsLock;

      MMMKeyboard.onKeyPress('{shift}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateNormal);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{shift}');
    });
  });

  describe('{lock}', () => {
    it('sets shiftState to caps lock from normal', () => {
      MMMKeyboard.shiftState = shiftStateNormal;

      MMMKeyboard.onKeyPress('{lock}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateCapsLock);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{lock}');
    });

    it('sets shiftState to caps lock from shift', () => {
      MMMKeyboard.shiftState = shiftStateShift;

      MMMKeyboard.onKeyPress('{lock}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateCapsLock);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{lock}');
    });

    it('sets shiftState to normal from caps lock', () => {
      MMMKeyboard.shiftState = shiftStateCapsLock;

      MMMKeyboard.onKeyPress('{lock}');

      expect(MMMKeyboard.shiftState).toBe(shiftStateNormal);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{lock}');
    });
  });

  describe('{numbers}', () => {
    it('calls handleNumbers', () => {
      MMMKeyboard.onKeyPress('{numbers}');

      expect(MMMKeyboard.handleNumbers).toHaveBeenCalled();
    });
  });

  describe('{backspace}', () => {
    it('calls handleNumbers', () => {
      MMMKeyboard.onKeyPress('{abc}');

      expect(MMMKeyboard.handleNumbers).toHaveBeenCalled();
    });
  });

  describe('{backspace}', () => {
    beforeEach(() => {
      const kbInput = document.createElement('input');
      kbInput.id = 'kbInput';
      document.body.appendChild(kbInput);
    });

    it('does nothing if there is still input', () => {
      document.getElementById('kbInput').value = 'something';

      MMMKeyboard.onKeyPress('{backspace}');

      expect(MMMKeyboard.handleShift).not.toHaveBeenCalled();
    });

    it('sets shift state and handles shift with value', () => {
      document.getElementById('kbInput').value = '';

      MMMKeyboard.onKeyPress('{backspace}');

      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('{backspace}');
      expect(MMMKeyboard.shiftState).toBe(shiftStateShift);
    });

    it('does nothing if not startUppercase', () => {
      MMMKeyboard.config.startUppercase = false;
      document.getElementById('kbInput').value = '';

      MMMKeyboard.onKeyPress('{backspace}');

      expect(MMMKeyboard.handleShift).not.toHaveBeenCalled();
    });
  });

  describe('anything else', () => {
    it('sets shiftState to normal from normal', () => {
      MMMKeyboard.shiftState = shiftStateNormal;

      MMMKeyboard.onKeyPress('foobar');

      expect(MMMKeyboard.shiftState).toBe(shiftStateNormal);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('foobar');
    });

    it('sets shiftState to normal from shift', () => {
      MMMKeyboard.shiftState = shiftStateShift;

      MMMKeyboard.onKeyPress('foobar');

      expect(MMMKeyboard.shiftState).toBe(shiftStateNormal);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('foobar');
    });

    it('sets shiftState to caps lock from caps lock', () => {
      MMMKeyboard.shiftState = shiftStateCapsLock;

      MMMKeyboard.onKeyPress('foobar');

      expect(MMMKeyboard.shiftState).toBe(shiftStateCapsLock);
      expect(MMMKeyboard.handleShift).toHaveBeenCalledWith('foobar');
    });
  });
});

describe('handleShift', () => {
  beforeEach(() => {
    MMMKeyboard.showKeyboard = jest.fn();
  });

  it('sets layout to numbers if already set in keyboard', () => {
    MMMKeyboard.keyboard.options.layoutName = 'numbers';

    MMMKeyboard.handleShift();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'numbers',
    });
  });

  it('sets layout to default if shiftState is default', () => {
    MMMKeyboard.shiftState = shiftStateNormal;

    MMMKeyboard.handleShift();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'default',
    });
  });

  it('sets layout to default if shiftState is shift', () => {
    MMMKeyboard.shiftState = shiftStateShift;

    MMMKeyboard.handleShift();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'shift',
    });
  });

  it('sets layout to default if shiftState is caps', () => {
    MMMKeyboard.shiftState = shiftStateCapsLock;

    MMMKeyboard.handleShift();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'shift',
    });
  });
});

describe('handleNumbers', () => {
  beforeEach(() => {
    MMMKeyboard.showKeyboard = jest.fn();
  });

  it('sets layout to default if already set in keyboard', () => {
    MMMKeyboard.keyboard.options.layoutName = 'numbers';

    MMMKeyboard.handleNumbers();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'default',
    });
  });

  it('sets layout to numbers if not already keyboard numbers', () => {
    MMMKeyboard.keyboard.options.layoutName = 'default';

    MMMKeyboard.handleNumbers();

    expect(MMMKeyboard.keyboard.setOptions).toHaveBeenCalledWith({
      layoutName: 'numbers',
    });
  });
});

describe('buildKeyboard', () => {
  beforeEach(() => {
    window.SimpleKeyboard = {};
    window.SimpleKeyboard.default = class {
      data = {};

      constructor (data) {
        this.data = data;
      }
    };
    MMMKeyboard.layouts = {
      en: { layout: 'English'},
      de: { layout: 'Deutsch'},
    };
  });

  it('builds a new keyboard', () => {
    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data).toMatchSnapshot();
  });

  it('sets layout to numbers if starts with numbers', () => {
    MMMKeyboard.config.startWithNumbers = true;

    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data.layoutName).toBe('numbers');
  });

  it('sets layout to default if shift state is default', () => {
    MMMKeyboard.shiftState = shiftStateNormal;

    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data.layoutName).toBe('default');
  });

  it('sets layout to shift if shift state is shift', () => {
    MMMKeyboard.shiftState = shiftStateShift;

    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data.layoutName).toBe('shift');
  });

  it('sets layout to shift if shift state is caps', () => {
    MMMKeyboard.shiftState = shiftStateCapsLock;

    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data.layoutName).toBe('shift');
  });

  it('passes theme to keyboard', () => {
    MMMKeyboard.config.theme = 'classic';

    MMMKeyboard.buildKeyboard();

    expect(MMMKeyboard.keyboard.data.theme).toBe('hg-theme-classic');
  });
});

describe('showKeyboard', () => {
  let send;
  let hide;

  beforeEach(() => {
    MMMKeyboard.kbContainer = document.createElement('div');
    const inputDiv = document.createElement('div');
    inputDiv.id = 'inputDiv';
    const kbInput = document.createElement('div');
    kbInput.id = 'kbInput';
    document.body.appendChild(inputDiv);
    document.body.appendChild(kbInput);
    send = document.createElement('button');
    send.id = 'sendButton';
    send.className = 'sendButton';
    send.innerText = MMMKeyboard.config.sendLabel;
    send.setAttribute('name', 'sendButton');
    hide = document.createElement('button');
    hide.id = 'hideButton';
    hide.className = 'hideButton';
    hide.innerText = MMMKeyboard.config.hideLabel;
    hide.setAttribute('name', 'hideButton');
    document.body.appendChild(send);
    document.body.appendChild(hide);
  });

  it('sets appropriate attributes', () => {
    MMMKeyboard.showKeyboard();

    expect(MMMKeyboard.kbContainer.classList).toContain('show-keyboard');
    expect(document.getElementById('kbInput').value).toBe('');
  });

  it('updates the send button with payload override', () => {
    MMMKeyboard.current = {
      sendLabel: 'Overridden',
    };

    MMMKeyboard.showKeyboard();

    expect(document.getElementById('sendButton').innerText)
      .toBe('Overridden');
  });

  it('updates the hide button with payload override', () => {
    MMMKeyboard.current = {
      hideLabel: 'Close',
    };

    MMMKeyboard.showKeyboard();

    expect(document.getElementById('hideButton').innerText)
      .toBe('Close');
  });

  it('will reset custom send button with config', () => {
    send.innerText = 'custom';
    MMMKeyboard.current = {};

    MMMKeyboard.showKeyboard();

    expect(document.getElementById('sendButton').innerText)
      .toBe(MMMKeyboard.config.sendLabel);
  });

  it('sets the value from current if specified from payload', () => {
    MMMKeyboard.current = {
      value: 'existing value',
    };

    MMMKeyboard.showKeyboard();

    expect(document.getElementById('kbInput').value).toBe('existing value');
  });

  it('clears the text box if value is not included', () => {
    MMMKeyboard.current = {};
    document.getElementById('kbInput').value = 'existing value';

    MMMKeyboard.showKeyboard();

    expect(document.getElementById('kbInput').value).toBe('');
  });
});

describe('hideKeyboardWithoutSubmit', () => {
  beforeEach(() => {
    MMMKeyboard.hideKeyboard = jest.fn();
  });

  it('hides the keyboard', () => {
    MMMKeyboard.hideKeyboardWithoutSubmit();

    expect(MMMKeyboard.hideKeyboard).toHaveBeenCalled();
  });

  it('does nothing if alwaysShow', () => {
    MMMKeyboard.config.alwaysShow = true;
    MMMKeyboard.kbContainer = document.createElement('div');
    MMMKeyboard.kbContainer.classList.add('show-keyboard');

    MMMKeyboard.hideKeyboardWithoutSubmit();

    expect(MMMKeyboard.kbContainer.classList).toContain('show-keyboard');
  });

  it('sends a "KEYBOARD_CLOSED" notification', () => {
    MMMKeyboard.current = {
      key: 'test-key',
      data: { foo: 'bar' },
      sendLabel: 'senddddd',
      value: 'old value',
    };

    MMMKeyboard.hideKeyboardWithoutSubmit();

    expect(MMMKeyboard.sendNotification).toHaveBeenCalledWith('KEYBOARD_CLOSED', {
      key: 'test-key',
      data: { foo: 'bar' },
    });
  });
});

describe('hideKeyboard', () => {
  it('sets appropriate attributes', () => {
    MMMKeyboard.kbContainer = document.createElement('div');
    MMMKeyboard.kbContainer.classList.add('show-keyboard');

    MMMKeyboard.hideKeyboard();

    expect(MMMKeyboard.kbContainer.classList).not.toContain('show-keyboard');
  });

  it('enables kbButton if debug is set', () => {
    MMMKeyboard.config.debug = true;
    MMMKeyboard.kbContainer = document.createElement('div');
    MMMKeyboard.kbContainer.classList.add('show-keyboard');
    const kbButton = document.createElement('div');
    kbButton.classList.add('kbButton');
    kbButton.style.display = 'none';
    document.body.appendChild(kbButton);

    MMMKeyboard.hideKeyboard();

    expect(document.getElementsByClassName('kbButton')[0].style.display)
      .toBe('block');
  });

  it('does not enable kbButton if debug is set', () => {
    MMMKeyboard.config.debug = false;
    MMMKeyboard.kbContainer = document.createElement('div');
    MMMKeyboard.kbContainer.classList.add('show-keyboard');
    const kbButton = document.createElement('div');
    kbButton.classList.add('kbButton');
    kbButton.style.display = 'none';
    document.body.appendChild(kbButton);

    MMMKeyboard.hideKeyboard();

    expect(document.getElementsByClassName('kbButton')[0].style.display)
      .toBe('none');
  });

  it('does nothing if alwaysShow', () => {
    MMMKeyboard.config.alwaysShow = true;
    MMMKeyboard.kbContainer = document.createElement('div');
    MMMKeyboard.kbContainer.classList.add('show-keyboard');

    MMMKeyboard.hideKeyboard();

    expect(MMMKeyboard.kbContainer.classList).toContain('show-keyboard');
  });
});
