import React from 'react';

// Compact inline pairing button for the settings tab.
// Sits in the sm:4 grid cell next to the apiKey password field.
// Uses DOM IDs for state (no hooks) so it works with React 17/18.

function PairButton(props) {
    var data = props && props.data;
    var socket = props && props.socket;
    var instance = props && props.instance != null ? props.instance : 0;
    var onChange = props && props.onChange;
    var lang = (props && props.lang) || 'en';
    var de = lang === 'de';

    var uid = 'tint_pb_' + instance;
    var btnId = uid + '_btn';
    var msgId = uid + '_msg';

    function handleClick() {
        var ip = data && data.ip;
        var port = Number((data && data.port) || 80);
        var btn = document.getElementById(btnId);
        var msg = document.getElementById(msgId);

        if (!ip) {
            if (msg) {
                msg.style.color = '#c62828';
                msg.style.display = 'block';
                msg.textContent = de ? 'IP-Adresse fehlt!' : 'IP address missing!';
            }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = de ? 'Warte…' : 'Waiting…';
        }
        if (msg) {
            msg.style.color = '#616161';
            msg.style.display = 'block';
            msg.textContent = de
                ? 'Pairing-Fenster in deCONZ öffnen …'
                : 'Open pairing window in deCONZ …';
        }

        function onDone(res) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'deCONZ Pairing';
            }
            if (res && res.apiKey) {
                if (typeof onChange === 'function') {
                    onChange(Object.assign({}, data, { apiKey: res.apiKey }));
                }
                if (msg) {
                    msg.style.color = '#2e7d32';
                    msg.textContent = de
                        ? '✓ Schlüssel eingetragen — bitte Speichern!'
                        : '✓ Key received — please Save!';
                }
            } else {
                if (msg) {
                    msg.style.color = '#c62828';
                    msg.textContent = '✗ ' + ((res && res.error) || (de ? 'Fehler' : 'Error'));
                }
            }
        }

        var target = 'tint.' + instance;
        try {
            if (socket && typeof socket.sendTo === 'function') {
                var p = socket.sendTo(target, 'pair', { ip: ip, port: port });
                if (p && typeof p.then === 'function') {
                    p.then(onDone).catch(function (e) { onDone({ error: e.message }); });
                } else {
                    socket.sendTo(target, 'pair', { ip: ip, port: port }, onDone);
                }
            } else if (socket && typeof socket.emit === 'function') {
                socket.emit('sendTo', target, 'pair', { ip: ip, port: port }, onDone);
            } else {
                onDone({ error: de ? 'Socket nicht verfügbar' : 'Socket not available' });
            }
        } catch (e) {
            onDone({ error: e.message });
        }
    }

    return React.createElement(
        'div',
        { style: { paddingTop: '14px' } },
        React.createElement(
            'button',
            {
                id: btnId,
                onClick: handleClick,
                style: {
                    width: '100%',
                    padding: '7px 10px',
                    background: 'transparent',
                    color: '#1976d2',
                    border: '1px solid rgba(25,118,210,0.5)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    letterSpacing: '0.02857em',
                    textTransform: 'uppercase',
                    lineHeight: 1.75,
                },
            },
            'deCONZ Pairing',
        ),
        React.createElement('div', {
            id: msgId,
            style: {
                display: 'none',
                marginTop: '4px',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                wordBreak: 'break-word',
            },
        }),
    );
}

window.PairButton = PairButton;
