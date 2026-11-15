/* global Module */
/* global config */

const shiftStateNormal = 0;
const shiftStateShift = 1;
const shiftStateCapsLock = 2;

/*jshint esversion: 6 */
Module.register('MMM-Keyboard', {
  defaults: {
    alwaysShow: false,
    layout: 'default',
    language: config.language || 'en',
    startUppercase: true,
    startWithNumbers: false,
    sendLabel: 'SEND!',
    hideLabel: '\u21e7',
    theme: 'default',
    debug: false,
  },

  current: {},

  layouts: {},

  getStyles: function () {
    return [
      this.file('keyboard.css'),
      this.file('node_modules/simple-keyboard/build/css/index.css'),
    ];
  },

  getScripts: function () {
    return [
      this.file('node_modules/simple-keyboard/build/index.js'),
    ];
  },

  start: function () {
    this.shiftState = this.config.startUppercase
      ? shiftStateShift
      : shiftStateNormal;
    if (!['de', 'en'].includes(this.config.language)) {
      this.config.language = 'en';
    }
    this.loadLayouts();
  },

  loadLayouts: function () {
    this.log('Loading keyboard layouts');
    const xobj = new XMLHttpRequest();
    const self = this;
    xobj.overrideMimeType('application/json');
    xobj.open('GET', this.file('layouts.json'), true);
    xobj.onreadystatechange = function () {
      if (xobj.readyState === 4 && xobj.status === 200) {
        self.layouts = JSON.parse(xobj.responseText);
        self.log('Layouts loaded: ' + self.layouts[self.config.language]);
        self.buildKeyboard();
      }
    };
    xobj.send(null);
  },

  getDom: function () {
    const {debug, alwaysShow} = this.config;

    const container = document.createElement('div');
    container.className = 'keyboardWrapper';
    if (debug) {
      const kbButton = document.createElement('div');
      kbButton.width = '100px';
      kbButton.className = 'kbButton fas fa-keyboard';
      kbButton.addEventListener('click', _event => {
        this.showKeyboard();
        kbButton.style.display = 'none';
      });
      container.appendChild(kbButton);
    }
    this.kbContainer = document.createElement('div');
    this.kbContainer.className = 'kbContainer';
    if (alwaysShow) {
      this.kbContainer.classList.add('show-keyboard');
    }

    const inputDiv = document.createElement('div');
    inputDiv.id = 'inputDiv';
    const input = document.createElement('input');
    input.id = 'kbInput';
    input.setAttribute('type', 'text');
    input.addEventListener('input', event => {
      this.keyboard.setInput(event.target.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.sendInput();
      }
    });
    const send = document.createElement('button');
    send.id = 'sendButton';
    send.className = 'sendButton';
    send.innerText = this.config.sendLabel;
    send.setAttribute('name', 'sendButton');
    send.onclick = () => {
      this.sendInput();
    };
    const hideButton = document.createElement('button');
    hideButton.id = 'hideButton';
    hideButton.className = 'hideButton';
    hideButton.innerText = this.config.hideLabel;
    hideButton.setAttribute('name', 'hideButton');
    hideButton.onclick = () => {
      this.hideKeyboardWithoutSubmit();
      document.getElementById('kbInput').value = '';
    };

    inputDiv.appendChild(input);
    inputDiv.appendChild(send);
    inputDiv.appendChild(hideButton);
    this.kbContainer.appendChild(inputDiv);
    const kb = document.createElement('div');
    kb.className = 'simple-keyboard';
    this.kbContainer.appendChild(kb);
    container.appendChild(this.kbContainer);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideKeyboardWithoutSubmit();
      }
    });

    return container;
  },

  notificationReceived: function (notification, payload) {
    if (notification === 'DOM_OBJECTS_CREATED') {
      this.log('MMM-Keyboard: Initializing keyboard');
      //Add event listener on first implementation of keyboard.
    } else if (notification === 'KEYBOARD') {
      this.log('MMM-Keyboard recognized a notification: ' + notification + JSON.stringify(payload));
      this.log('Activating Keyboard!');
      this.current = payload;
      const layoutName = payload.style == 'default'
        ? (this.config.startUppercase && !this.current.value
          ? 'shift'
          : 'default')
        : 'numbers';
      this.keyboard.setOptions({layoutName});
      this.showKeyboard();
    }
  },

  sendInput: function () {
    const message = document.getElementById('kbInput').value;
    this.log('MMM-Keyboard sent input: ' + message);
    const {key, data} = this.current;
    this.sendNotification('KEYBOARD_INPUT', {
      key,
      data,
      message,
    });
    this.keyboard.clearInput();
    document.getElementById('kbInput').value = '';
    if (this.config.startUppercase) {
      this.shiftState = shiftStateShift;
    }
    this.hideKeyboard();
  },

  onChange: function (input) {
    const kbInput = document.getElementById('kbInput');
    kbInput.value = input;
    this.log('Input changed: ' + input);
    if (kbInput.value == '' && this.config.startUppercase) {
      this.shiftState = shiftStateShift;
      this.handleShift();
    }
  },

  onKeyPress: function (button) {
    /**
     * Handles shift, lock and numbers buttons.
     */
    switch (button) {
      case '{shift}':
        this.shiftState = (this.shiftState === shiftStateNormal)
          ? shiftStateShift
          : (this.shiftState === shiftStateShift)
            ? shiftStateCapsLock
            : shiftStateNormal;
        this.handleShift(button);
        break;
      case '{lock}':
        this.shiftState = this.shiftState < shiftStateCapsLock
          ? shiftStateCapsLock
          : shiftStateNormal;
        this.handleShift(button);
        break;
      case '{numbers}':
      case '{abc}':
        this.handleNumbers();
        break;
      case '{backspace}':
        if (document.getElementById('kbInput').value == '' && this.config.startUppercase) {
          this.shiftState = shiftStateShift;
          this.handleShift(button);
        };
        break;
      default:
        this.shiftState = this.shiftState < shiftStateCapsLock
          ? shiftStateNormal
          : shiftStateCapsLock;
        this.handleShift(button);
    }
  },

  handleShift: function (button) {
    const layout = (this.keyboard.options.layoutName === 'numbers')
      ? 'numbers'
      : (this.shiftState === shiftStateNormal)
        ? 'default'
        : 'shift';
    this.keyboard.setOptions({
      layoutName: layout,
    });
    if (button === '{shift}') { this.log('Changing shift mode to ' + layout); }
  },

  handleNumbers: function () {
    const currentLayout = this.keyboard.options.layoutName;
    const numbersToggle = currentLayout !== 'numbers' ? 'numbers' : 'default';
    this.keyboard.setOptions({
      layoutName: numbersToggle,
    });
  },

  buildKeyboard: function () {
    /*document.addEventListener("click", event => {
      if (
        event.target !== this.keyboard.keyboardDOM
        && !event.target.classList.contains("keyboardWrapper")
        && !event.target.classList.contains("hg-button")
      ) {
        this.hideKeyboardWithoutSubmit();
      }
    });*/
    this.log(this.layouts);
    const Keyboard = window.SimpleKeyboard.default;
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      mergeDisplay: true,
      inputName: 'kbInput',
      layoutName: this.layout(),
      layout: this.layouts[this.config.language],
      theme: 'hg-theme-'+this.config.theme,
      buttonTheme: [
        {
          class: 'specialButton',
          buttons: '{shift} {ent} {escape} {lock} {tab} {altleft} {altright} {abc} {numbers} {backspace} 0',
        },
        {
          class: 'spaceButton',
          buttons: '{space}',
        },
        {
          class: 'emptyButton',
          buttons: ' ',
        },
      ],
      display: {
        '{numbers}': '123',
        '{ent}': 'return',
        '{escape}': 'esc',
        '{tab}': 'tab',
        '{backspace}': '  \u21e6  ',
        '{lock}': '  \u21ee  ',
        '{shift}': '  \u21e7  ',
        '{controlleft}': 'ctrl',
        '{controlright}': 'ctrl',
        '{altleft}': 'alt',
        '{altright}': 'alt',
        '{metaleft}': 'cmd',
        '{metaright}': 'cmd',
        '{abc}': 'ABC',
      },
    });
  },

  layout: function () {
    if (this.config.startWithNumbers) {
      return 'numbers';
    }

    return this.shiftState === shiftStateNormal
      ? 'default'
      : 'shift';
  },

  showKeyboard: function () {
    document.getElementById('sendButton').innerText = this.current.sendLabel
      ?? this.config.sendLabel;
    document.getElementById('hideButton').innerText = this.current.hideLabel
      ?? this.config.hideLabel;
    this.kbContainer.classList.add('show-keyboard');
    const { value } = this.current;
    this.keyboard.setInput(value ?? '');

    document.getElementById('kbInput').value = this.keyboard.getInput();
  },

  hideKeyboardWithoutSubmit: function () {
    if (this.config.alwaysShow) { return; }

    this.hideKeyboard();

    const { key, data } = this.current;
    this.sendNotification('KEYBOARD_CLOSED', { key, data });
  },

  hideKeyboard: function () {
    if (this.config.alwaysShow) { return; }

    this.kbContainer.classList.remove('show-keyboard');

    if (this.config.debug) {
      document.getElementsByClassName('kbButton')[0].style.display = 'block';
    }
  },

  log: function (msg) {
    if (this.config && this.config.debug) {
      console.log(this.name + ':', JSON.stringify(msg)); // eslint-disable-line no-console
    }
  },
});
