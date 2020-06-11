/*jshint esversion: 6 */
Module.register("MMM-Keyboard", {

  defaults: {
    showAlways: false,
    layout: "default",
    language: config.language || "en",
    startUppercase: true,
    startWithNumbers: false,
    debug: false,
  },

  layouts: {},

  getStyles: function () {
    return [
      this.file('keyboard.css'),
      this.file('node_modules/simple-keyboard/build/css/index.css')
    ];
  },

  getScripts: function () {
    return [
      this.file('node_modules/simple-keyboard/build/index.js')
    ];
  },

  start: function () {
    this.shiftState = (this.config.startUppercase) ? 1 : 0;
    if (!["de", "en"].includes(this.config.language)) {
      this.config.language = "en";
    }
    this.loadLayouts();
  },

  loadLayouts: function() {
    this.log("Loading keyboard layouts");
    var xobj = new XMLHttpRequest();
    var self = this;
    xobj.overrideMimeType("application/json");
    xobj.open("GET", this.file('layouts.json'), true);
    xobj.onreadystatechange = function() {
      if (xobj.readyState === 4 && xobj.status === 200) {
        self.layouts = JSON.parse(xobj.responseText);
        self.log("Layouts loaded: " + self.layouts[self.config.language]);
        self.buildKeyboard();      
      }
    };
    xobj.send(null);
  },

  getDom: function () {
    var container = document.createElement("div");
    container.className = "keyboardWrapper";
    if (this.config.debug) {
      var kbButton = document.createElement("div");
      kbButton.width = "100px";
      kbButton.className = "kbButton fas fa-keyboard";
      kbButton.addEventListener("click", event => {
        this.showKeyboard();
        kbButton.style.display = "none";
      });
      container.appendChild(kbButton);
    }
    this.kbContainer = document.createElement("div");
    this.kbContainer.className = "kbContainer";
    var inputDiv = document.createElement("div");
    inputDiv.id = "inputDiv";
    inputDiv.style.display = "none";
    var input = document.createElement("input");
    input.id = "kbInput";
    input.setAttribute("type", "text");
    input.addEventListener("input", event => {
      this.keyboard.setInput(event.target.value);
    });
    var send = document.createElement("button");
    send.className = "sendButton";
    send.innerText = "  SEND!  ";
    send.setAttribute("name", "sendButton");
    send.onclick = () => {
      this.sendInput();
    };
    var hideButton = document.createElement("button");
    hideButton.className = "sendButton";
    hideButton.innerText = "\u21e7";
    hideButton.style.backgroundColor = "#880000";
    hideButton.setAttribute("name", "hideButton");
    hideButton.onclick = () => {
      this.hideKeyboard();
      document.getElementById("kbInput").value = '';
    };

    inputDiv.appendChild(input);
    inputDiv.appendChild(send);
    inputDiv.appendChild(hideButton);
    this.kbContainer.appendChild(inputDiv);
    var kb = document.createElement("div");
    kb.className = "simple-keyboard";
    this.kbContainer.appendChild(kb);
    container.appendChild(this.kbContainer);
    return container;
  },

  notificationReceived: function (noti, payload) {
    if (noti == "DOM_OBJECTS_CREATED") {
      this.log("MMM-Keyboard: Initializing keyboard");
      //Add event listener on first implementation of keyboard.
    } else if (noti == "KEYBOARD") {
      console.log("MMM-Keyboard recognized a notification: " + noti + JSON.stringify(payload));
      this.log("Activating Keyboard!");
      this.currentKey = payload.key;
      this.currentData = payload.data;
      var layout = (payload.style == "default") ? ((this.config.startUppercase) ? "shift" : "default") : "numbers";
      this.keyboard.setOptions({
        layoutName: layout
      });
      this.showKeyboard();
    }
  },

  sendInput: function () {
    var message = document.getElementById("kbInput").value;
    this.log("MMM-Keyboard sent input: " + message);
    this.sendNotification("KEYBOARD_INPUT", { key: this.currentKey, message: message, data: this.currentData});
    this.keyboard.clearInput();
    document.getElementById("kbInput").value = "";
    if (this.config.startUppercase) { this.shiftState = 1; } 
    this.hideKeyboard();
  },
  
  itemClicked: function (item) {
    this.sendSocketNotification("PURCHASED_ITEM", item);
  },


  onChange: function(input) {
    var kbInput = document.getElementById("kbInput");
    kbInput.value = input;
    this.log("Input changed: " + input);
    if (kbInput.value == "" && this.config.startUppercase) {
      this.shiftState = 1;
      this.handleShift();
    }

  },

  onKeyPress: function(button) {
    /**
     * Handles shift, lock and numbers buttons.
     */
    switch (button) {
      case "{shift}":
        this.shiftState = (this.shiftState === 0) ? 1 : (this.shiftState === 1) ? 2 : 0;
        this.handleShift(button);
        break;
      case "{lock}":
        this.shiftState = (this.shiftState < 2) ? 2 : 0;
        this.handleShift(button);
        break;
      case "{numbers}":
      case "{abc}":
        this.handleNumbers();
        break;
      case "{backspace}":
        if (document.getElementById("kbInput").value == "" && this.config.startUppercase) {
          this.shiftState = 1;
          this.handleShift(button)
        };
        break;
      default:
        this.shiftState = (this.shiftState < 2) ? 0 : 2;
        this.handleShift(button);
    }
  },

  handleShift: function(button) {
    var layout = (this.keyboard.options.layoutName == "numbers") ? "numbers" : (this.shiftState == 0) ? "default" : "shift";
    this.keyboard.setOptions({
      layoutName: layout
    });
    if (button == "{shift}") { this.log("Changing shift mode to " + layout); }
    this.showKeyboard();
  },

  handleNumbers: function() {
    var currentLayout = this.keyboard.options.layoutName;
    var numbersToggle = currentLayout !== "numbers" ? "numbers" : "default";
    this.keyboard.setOptions({
      layoutName: numbersToggle
    });
    this.showKeyboard();
  },


  buildKeyboard: function() {
    /*document.addEventListener("click", event => {
      if ( event.target !== this.keyboard.keyboardDOM && !event.target.classList.contains("keyboardWrapper") && !event.target.classList.contains("hg-button")) {
        this.hideKeyboard();
      }
    });*/
    var kbLayout = (this.config.startWithNumbers) ? "numbers" : (this.shiftState == 0) ? "default" : "shift";
    console.log(kbLayout);
    console.log(this.layouts);
    var Keyboard = window.SimpleKeyboard.default;
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      mergeDisplay: true,
      inputName: "kbInput",
      layoutName: kbLayout,
      layout: this.layouts[this.config.language],
      buttonTheme: [
        {
          class: "specialButton",
          buttons: "{shift} {ent} {escape} {lock} {tab} {altleft} {altright} {abc} {numbers} {backspace} 0"
        },
        {
          class: "spaceButton",
          buttons: "{space}"
        },
        {
          class: "emptyButton",
          buttons: " "
        }
      ],
      display: {
        "{numbers}": "123",
        "{ent}": "return",
        "{escape}": "esc",
        "{tab}": "tab",
        "{backspace}": "  \u21e6  ",
        "{lock}": "  \u21ee  ",
        "{shift}": "  \u21e7  ",
        "{controlleft}": "ctrl",
        "{controlright}": "ctrl",
        "{altleft}": "alt",
        "{altright}": "alt",
        "{metaleft}": "cmd",
        "{metaright}": "cmd",
        "{abc}": "ABC"
      }
    });
  },

  showKeyboard: function() {
    this.kbContainer.classList.add("show-keyboard");
    document.getElementById("inputDiv").style.display = "block";
    document.getElementById("kbInput").value = this.keyboard.getInput();
  },

  hideKeyboard: function() {
    this.kbContainer.classList.remove("show-keyboard");
    if (this.config.debug) {
      document.getElementsByClassName("kbButton")[0].style.display = "block";
    }
  },

  log: function (msg) {
    if (this.config && this.config.debug) {
      console.log(this.name + ":", JSON.stringify(msg));
    }
  },

});
