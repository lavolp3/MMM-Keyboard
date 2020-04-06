/*jshint esversion: 6 */
Module.register("MMM-Keyboard", {

  defaults: {
    showAlways: false,
    locale: "en",
    debug: false
  },

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
    this.keyboardActive = false;
    this.updateDom();
  },

  getDom: function () {
    var container = document.createElement("div");
    container.className = "keyboardWrapper";
    var self = this;
    if (this.config.debug) {
      var kbButton = document.createElement("div");
      kbButton.width = "100px";
      kbButton.className = "kbButton fas fa-keyboard";
      kbButton.addEventListener("click", event => {
        this.toggleKeyboard();
      });
      container.appendChild(kbButton);
    }
    var inputDiv = document.createElement("div");
    inputDiv.id = "inputDiv";
    inputDiv.style.display = "none";
    var input = document.createElement("input");
    input.id = "inputField";
    input.setAttribute("type", "text");
    input.addEventListener("input", event => {
      self.keyboard.setInput(event.target.value);
    });
    var send = document.createElement("button");
    send.className = "sendButton";
    send.innerText = "SEND!";
    send.setAttribute("name", "sendButton");
    send.onclick = () => {
      var message = document.getElementById("inputField").value;
      this.log("MMM-Keyboard sent input: " + message);
      this.sendNotification("KEYBOARD_INPUT", { key: this.currentKey, message: message});
      this.hideKeyboard();
      document.getElementById("inputField").value = '';
    };
    var hideButton = document.createElement("button");
    hideButton.className = "sendButton";
    hideButton.innerText = "\u21e7";
    hideButton.style.backgroundColor = "#880000";
    hideButton.setAttribute("name", "hideButton");
    hideButton.onclick = () => {
      this.hideKeyboard();
      document.getElementById("inputField").value = '';
    };
    
    inputDiv.appendChild(input);
    inputDiv.appendChild(send);
    inputDiv.appendChild(hideButton);
    container.appendChild(inputDiv);
    var kb = document.createElement("div");
    kb.className = "simple-keyboard";
    container.appendChild(kb);
    return container;
  },

  notificationReceived: function (noti, payload) {
    if (noti == "DOM_OBJECTS_CREATED") {
      this.log("MMM-Keyboard: Initializing keyboard");
      this.buildKeyboard();
      //Add event listener on first implementation of keyboard.
    } else if (noti == "KEYBOARD") {
      console.log("MMM-Keyboard recognized a notification: " + noti + JSON.stringify(payload));
      this.log("Activating Keyboard!");
      this.currentKey = payload.key;
      this.showKeyboard(payload.style);
    }
  },

  itemClicked: function (item) {
    this.sendSocketNotification("PURCHASED_ITEM", item);
  },


  onChange: function(input) {
    document.getElementById("inputField").value = input;
    //this.log("Input changed", input);
  },

  onKeyPress: function(button) {
    /**
     * If you want to handle the shift and caps lock buttons
     */
    if (button === "{shift}" || button === "{lock}") { this.handleShift(); }
    if (button === "{numbers}" || button === "{abc}") { this.handleNumbers(); }
  },

  handleShift: function() {
    let currentLayout = this.keyboard.options.layoutName;
    let shiftToggle = currentLayout === "default" ? "shift" : "default";
    this.log("Changing shift mode to " + shiftToggle);

    this.keyboard.setOptions({
      layoutName: shiftToggle
    });
    this.showKeyboard();
  },

  handleNumbers: function() {
    let currentLayout = this.keyboard.options.layoutName;
    let numbersToggle = currentLayout !== "numbers" ? "numbers" : "default";
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
    var Keyboard = window.SimpleKeyboard.default;
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      mergeDisplay: true,
      layoutName: "default",
      layout: {
        default: [
          "q w e r t y u i o p {backspace}",
          "a s d f g h j k l ; '",
          "{shift} z x c v b n m , . /",
          "{numbers} {space} {ent}"
        ],
        shift: [
          "Q W E R T Y U I O P {backspace}",
          "A S D F G H J K L ; ' ",
          "{shift} Z X C V B N M , . /",
          "{numbers} {space} {ent}"
        ],
        numbers: ["1 2 3", "4 5 6", "7 8 9", "{abc} 0 {backspace}"]
      },
      buttonTheme: [
        {
          class: "specialButton",
          buttons: "{shift} {ent} {escape} {capslock} {tab} {altleft} {altright} {abc} {numbers} {backspace}"
        },
        {
          class: "spaceButton",
          buttons: "{space}"
        }
      ],
      display: {
        "{numbers}": "123",
        "{ent}": "return",
        "{escape}": "esc",
        "{tab}": "tab",
        "{backspace}": "  \u21e6  ",
        "{capslock}": "  \u21ee  ",
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

  toggleKeyboard: function() {
    if (this.keyboardActive) {
      this.hideKeyboard();
    } else {
      this.showKeyboard();
    }
  },

  showKeyboard: function() {
    this.keyboardActive = true;
    this.keyboard.keyboardDOM.classList.add("show-keyboard");
    document.getElementById("inputDiv").style.display = "block";

  },

  hideKeyboard: function() {
    this.keyboardActive = false;
    this.keyboard.keyboardDOM.classList.remove("show-keyboard");
    document.getElementById("inputDiv").style.display = "none";
  },

  log: function (msg) {
    if (this.config && this.config.debug) {
      console.log(this.name + ":", JSON.stringify(msg));
    }
  },

});
