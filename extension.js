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
 * isPianobarRunning - checks if the pianobar process is currently running.  
 * This can be used to conditionally enable/disable the extension buttons or 
 * show a warning if pianobar is not running.
 * 
 * @returns boolean
 */
function isPianobarRunning() {
    try {
        const [success, stdout] = GLib.spawn_command_line_sync('pgrep -x pianobar');
        return success && stdout.length > 0;
    } catch (e) {
        console.error('Error checking pianobar process:', e);
        return false;
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
            { label: '⏭ Next Track', cmd: 'n', requiresRunning: true },
            { label: '⏯ Play/Pause', cmd: 'p', requiresRunning: false },
            { label: '⏹ Stop', cmd: 'q', requiresRunning: true },
            { label: '⏺ Download Current Track', cmd: 'd', requiresRunning: true },
            { label: '🔁 Switch Station', cmd: 'ss', requiresRunning: true },
            { label: '👍 Like Current Track', cmd: '+', requiresRunning: true },
            { label: '👎 Dislike Current Track', cmd: '-', requiresRunning: true },
            { label: '🥱 Tired (pause for a month)', cmd: 't', requiresRunning: true },
            { label: '📜 Show Upcoming', cmd: 'u', requiresRunning: true },
            { label: '🎱 Explain', cmd: 'e', requiresRunning: true },
        ];

        this._items = [];

        for (const { label, cmd, requiresRunning } of buttons) {
            const item = new PopupMenu.PopupMenuItem(label);
            item.connect('activate', () => {
                if (item.reactive) sendCommand(cmd);
            });
            this._indicator.menu.addMenuItem(item);
            this._items.push({ item, requiresRunning });
        }

        // Poll every 3 seconds
        this._updateState();
        this._pollId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this._updateState();
            return GLib.SOURCE_CONTINUE;
        });

        // Add to the left side of the top bar
        Main.panel.addToStatusArea('pianobar-controls', this._indicator);
    }

    _updateState() {
        const running = isPianobarRunning();

        for (const { item, requiresRunning} of this._items) {
            const enabled = !requiresRunning || running;
            item.reactive = enabled;
            item.can_focus = enabled;
            item.label.set_style(enabled ? '' : 'color: gray;');
        }
    }

    disable() {
        if (this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = null;
        }
        this._indicator?.destroy();
        this._indicator = null;
        this._items = null;
    }
}
