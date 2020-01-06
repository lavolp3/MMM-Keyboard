/*jshint esversion: 6 */
Module.register("MMM-Keyboard", {

  defaults: {
    hideKeyboard: true,
    locale: "de-DE"
  },

  getStyles: function () {
    return [
      this.file('node_modules/simple-keyboard/build/css/index.css')
    ];
  },

  getScripts: function () {
    return [
      this.file('node_modules/simple-keyboard/build/index.js')
    ];
  },

  start: function () {
    var Keyboard = window.SimpleKeyboard.default;
    var container = document.createElement("div");
    container.className = "keyboardWrapper";
    var inputDiv = document.createElement("div");
    inputDiv.className = "inputDiv";
    var input = document.createElement("input");
    input.id = "inputField";
    input.setAttribute("type", "text");
    input.addEventListener("input", event => {
      this.keyboard.setInput(event.target.value);
    });
    var send = document.createElement("button");
    send.className = "sendButton";
    send.innerText = "SEND!";
    send.setAttribute("name", "sendButton");
    send.onclick = () => {
      var input = document.getElementById("inputField").value;
      console.log("MMM-Keyboard sent input: "+input);
      this.sendNotification("KEYBOARD", input);
    };
    input.addEventListener("focus", event => {
      if (!this.keyboard) {
        console.log("MMM-Keyboard: Initializing keyboard");
        //Add event listener on first implementation of keyboard.
        document.addEventListener("click", event => {
          if ( event.target !== this.keyboard.keyboardDOM && event.target.id !== "inputField" && !event.target.classList.contains("hg-button")) {
            this.hideKeyboard();
          }
        });
      }
      this.keyboard = new Keyboard({
        onChange: input => this.onChange(input),
        onKeyPress: button => this.onKeyPress(button),
        mergeDisplay: true,
        layoutName: "default",
        layout: {
          default: [
            "q w e r t y u i o p ü",
            "a s d f g h j k l ä",
            "{shift} z x c v b n m ö {backspace}",
            "{numbers} {space} {ent}"
          ],
          shift: [
            "Q W E R T Y U I O P Ü",
            "A S D F G H J K L Ä",
            "{shift} Z X C V B N M Ö {backspace}",
            "{numbers} {space} {ent}"
          ],
          numbers: ["1 2 3", "4 5 6", "7 8 9", "{abc} 0 {backspace}"]
        },
        display: {
          "{numbers}": "123",
          "{ent}": "return",
          "{escape}": "esc ⎋",
          "{tab}": "tab ⇥",
          "{backspace}": "⌫",
          "{capslock}": "caps lock ⇪",
          "{shift}": "⇧",
          "{controlleft}": "ctrl ⌃",
          "{controlright}": "ctrl ⌃",
          "{altleft}": "alt ⌥",
          "{altright}": "alt ⌥",
          "{metaleft}": "cmd ⌘",
          "{metaright}": "cmd ⌘",
          "{abc}": "ABC"
        }
      });
    });
    inputDiv.appendChild(input);
    inputDiv.appendChild(send);
    container.appendChild(inputDiv);
    var kb = document.createElement("div");
    kb.className = "simple-keyboard";
    container.appendChild(kb);

  },

  getDom: function () {


    },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "LIST_DATA") {
      this.list = payload;
      this.updateDom(1000);
    } else  if (notification === "RELOAD_LIST") {
      this.sendSocketNotification("GET_LIST", this.config);
    }
  },

  itemClicked: function (item) {
    this.sendSocketNotification("PURCHASED_ITEM", item);
  },


  onChange: function(input) {
    document.getElementById("inputField").value = input;
  },

  onKeyPress: function(button) {
    /**
     * If you want to handle the shift and caps lock buttons
     */
    if (button === "{shift}" || button === "{lock}") this.handleShift();
    if (button === "{numbers}" || button === "{abc}") handleNumbers();
  },

  handleShift: function() {
    let currentLayout = this.keyboard.options.layoutName;
    let shiftToggle = currentLayout === "default" ? "shift" : "default";

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
  },

  showKeyboard: function() {
    this.keyboard.keyboardDOM.classList.remove("hide-keyboard");
  },

  hideKeyboard: function() {
    this.keyboard.keyboardDOM.classList.add("hide-keyboard");
  }

});
