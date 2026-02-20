/**
 * Pianobar Taskbar Extension
 * Adds a set of buttons to the GNOME top bar for controlling pianobar.  Requires
 * a helper script at ~/bin/control-pianobar that sends commands to pianobar's
 * FIFO.
 * 
 * Dependency: pianobar (https://6xq.net/pianobar/)
 * Dependency: control-pianobar (https://malabarba.github.io/control-pianobar/)
 * 
 * author: namtri
 */

import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

/**
 * sendCommand - sends a command to the control-pianobar script, which in turn issues
 * a command to control-pianobar.  This allows us to control pianobar without needing
 * to directly interact with the CLI.
 * 
 * @param {string} cmd the command to submit to control-pianobar
 */
function sendCommand(cmd) {
    const script = GLib.get_home_dir() + '/bin/control-pianobar';

    try {
        GLib.spawn_command_line_async(`${script} ${cmd}`);
    } catch (e) {
        console.error('Pianobar control error:', e);
    }
}

/**
 * PianobarExtension - the main extension class.  Adds buttons to the top bar and connects
 * them to the appropriate commands.
 */
export default class PianobarExtension extends Extension {
    enable() {
        // PanelMenu.Button args: menu alignment (0=left, 0.5=center, 1=right), accessible name
        this._indicator = new PanelMenu.Button(0, 'Pianobar Controls');

        const icon = new St.Label({
            text: '🎵',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._indicator.add_child(icon);

        const buttons = [
            { label: '⏭ Next Track', cmd: 'n' },
            { label: '⏯ Play/Pause', cmd: 'p' },
            { label: '⏹ Stop', cmd: 'q' },
            { label: '⏺ Download Current Track', cmd: 'd' },
            { label: '🔁 Switch Station', cmd: 'ss' },
            { label: '👍 Like Current Track', cmd: '+' },
            { label: '👎 Dislike Current Track', cmd: '-' },
            { label: '🥱 Tired (pause for a month)', cmd: 't' },
            { label: '📜 Show Upcoming', cmd: 'u' },
            { label: '🎱 Explain', cmd: 'e' },
        ];

        for (const { label, cmd } of buttons) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => sendCommand(cmd));
            this._indicator.menu.addMenuItem(item);
        }

        // Add to the left side of the top bar
        Main.panel.addToStatusArea('pianobar-controls', this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
