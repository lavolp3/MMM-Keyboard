# MMM-Keyboard

![Alt text](MMM-Keyboard-example.png "MMM-Keyboard preview.")

A module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/) that creates a virtual keyboard to be used to send commands or text to other modules

## Features
 * Touch Support
 * Locale Support

## Installing

### Step 1 - Install the module
```javascript
cd ~/MagicMirror/modules
git clone https://github.com/lavolp3/MMM-Keyboard.git
cd MMM-Keyboard
npm install
```

### Step 2 - Add module to `~MagicMirror/config/config.js`
Add this configuration into `config.js` file's
```javascript
{
    module: "MMM-Keyboard",
    position: "top_right",
    config: {
       locale: "de-DE"
    }
}
```

## Dependencies

* [simple-keyboard](https://www.npmjs.com/package/simple-keyboard)
* [swipe-keyboard](https://www.npmjs.com/package/swipe-keyboard)

## Updating
Go to the module’s folder inside MagicMirror modules folder and pull the latest version from GitHub:
```
git pull
npm install
```
## Configuring


| Option               | Description
|--------------------- |-----------
| `maxLatestItems`     | Maximum recent items to display. <br>**Type:** `number` <br> **Default value:** `0` (all)
| `locale`             | The locale. <br>**Type:** `string` <br> **Default value:** `de-DE`
| `swipe`              | Activate swipe mode (experimental!) **Default value:** false
