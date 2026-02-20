/**
 * Pianobar Taskbar Extension
 * Adds a set of buttons to the GNOME top bar for controlling pianobar.  Requires
 * a helper script at ~/bin/control-pianobar that sends commands to pianobar's
 * FIFO.
 * 
 * Dependency: pianobar (https://6xq.net/pianobar/)
 * Dependency: control-pianobar (https://malabarba.github.io/control-pianobar/)
 * 
 * author: namtri.com
 */
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
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

export default class PianobarExtension extends Extension {
    enable() {
        this._box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

        const buttons = [
            { label: '⏭', cmd: 'n', tooltip: 'Next song' },
            { label: '⏯', cmd: 'p', tooltip: 'Play/Pause' },
            { label: '⏹', cmd: 'q', tooltip: 'Stop' },
            { label: '⏺', cmd: 'd', tooltip: 'Download current song' },
            { label: '🔁', cmd: 'ss', tooltip: 'Switch station' },
            { label: '👍', cmd: '+', tooltip: 'Like current song' },
            { label: '👎', cmd: '-', tooltip: 'Dislike current song' },
            { label: '🥱', cmd: 't', tooltip: 'Tired (won\'t play for a month)' },
        ];

        for (const { label, cmd, tooltip } of buttons) {
            const btn = new St.Button({
                label,
                style_class: 'panel-button',
                can_focus: true,
                track_hover: true,
                reactive: true
            });

            btn.set_accessible_name(tooltip);

            // Create tooltip label, hidden by default
            const tooltipLabel = new St.Label({
                text: tooltip,
                style_class: 'dash-label',// 'pianobar-tooltip',
                visible: false
            });
            Main.layoutManager.addChrome(tooltipLabel);
            tooltipLabel.hide();

            btn.connect('notify::hover', () => {
                if (btn.hover) {
                    const [x, y] = btn.get_transformed_position();
                    tooltipLabel.set_position(Math.floor(x), Math.floor(y + btn.get_height() + 5));
                    tooltipLabel.ease({
                        opacity: 255,
                        duration: 100,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        onComplete: () => tooltipLabel.show()
                    });
                } else {
                    tooltipLabel.ease({
                        opacity: 0,
                        duration: 100,
                        mode: Clutter.AnimationMode.EASE_IN_QUAD,
                        onComplete: () => tooltipLabel.hide()
                    });
                }
            });

            btn.connect('clicked', () => sendCommand(cmd));
            this._box.add_child(btn);
        }

        // Add to the left side of the top bar
        Main.panel._leftBox.add_child(this._box);
    }

    disable() {
        this._box?.destroy();
        this._box = null;
    }
}
