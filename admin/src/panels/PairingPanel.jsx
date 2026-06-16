import React from 'react';

// Pure React-17 render, no ref, no ReactDOM, no hooks.
// Admin 7 (React 18) calls window.PairingPanel(props) and renders the returned elements itself.
// We use unique DOM IDs to track button/message state without React.useState.

function PairingPanel(props) {
    var data = props && props.data;
    var socket = props && props.socket;
    var instance = props && props.instance;
    var onChange = props && props.onChange;
    var lang = (props && props.lang) || 'en';
    var de = lang === 'de';

    var uid = 'tint_pair_' + (instance != null ? instance : '0');
    var btnId = uid + '_btn';
    var msgId = uid + '_msg';

    function handleClick() {
        var ip = data && data.ip;
        var port = Number((data && data.port) || 80);
        var btn = document.getElementById(btnId);
        var msg = document.getElementById(msgId);

        if (!ip) {
            if (msg) {
                msg.style.background = '#ffebee';
                msg.style.color = '#c62828';
                msg.style.display = 'block';
                msg.textContent = de
                    ? 'Bitte zuerst die IP-Adresse des deCONZ-Gateways eingeben.'
                    : 'Please enter the deCONZ gateway IP address first.';
            }
            return;
        }

        if (btn) { btn.disabled = true; btn.textContent = de ? 'Warte auf Pairing…' : 'Waiting for pairing…'; }
        if (msg) {
            msg.style.background = '#e3f2fd';
            msg.style.color = '#1565c0';
            msg.style.display = 'block';
            msg.textContent = de
                ? 'Warte auf deCONZ-Pairing-Fenster (bis zu 60 Sekunden)…'
                : 'Waiting for deCONZ pairing window (up to 60 seconds)…';
        }

        function onDone(res) {
            if (btn) {
                btn.disabled = false;
                btn.textContent = de ? 'Auf deCONZ-Pairing warten…' : 'Wait for deCONZ pairing…';
            }
            if (res && res.apiKey) {
                if (typeof onChange === 'function') {
                    onChange(Object.assign({}, data, { apiKey: res.apiKey }));
                }
                if (msg) {
                    msg.style.background = '#e8f5e9';
                    msg.style.color = '#2e7d32';
                    msg.textContent = de
                        ? 'API-Schlüssel übernommen! Bitte auf „Speichern" klicken.'
                        : 'API key received! Please click "Save".';
                }
            } else {
                if (msg) {
                    msg.style.background = '#ffebee';
                    msg.style.color = '#c62828';
                    msg.textContent = (de ? 'Fehler: ' : 'Error: ') + ((res && res.error) || 'Unknown');
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
                    // Older API: sendTo(instance, command, data, callback)
                    socket.sendTo(target, 'pair', { ip: ip, port: port }, onDone);
                }
            } else if (socket && typeof socket.emit === 'function') {
                socket.emit('sendTo', target, 'pair', { ip: ip, port: port }, onDone);
            } else {
                onDone({ error: 'Socket not available' });
            }
        } catch (e) {
            onDone({ error: e.message });
        }
    }

    var btnLabel = de ? 'Auf deCONZ-Pairing warten…' : 'Wait for deCONZ pairing…';

    return React.createElement(
        'div',
        { style: { width: '100%', paddingTop: '8px', paddingBottom: '16px' } },
        React.createElement(
            'h3',
            { style: { fontSize: '1rem', fontWeight: 500, margin: '16px 0 8px', color: 'rgba(0,0,0,0.87)' } },
            de ? 'API-Schlüssel automatisch beziehen' : 'Obtain API key automatically',
        ),
        React.createElement(
            'p',
            { style: { fontSize: '0.875rem', color: '#616161', margin: '0 0 14px', lineHeight: 1.5 } },
            de
                ? 'Öffnen Sie in deCONZ/Phoscon: Menü → Gateway → App authentifizieren. Klicken Sie dann unten – der Adapter wartet bis zu 60 Sekunden.'
                : 'Open deCONZ/Phoscon: Menu → Gateway → Authenticate app. Then click below — the adapter waits up to 60 seconds.',
        ),
        React.createElement(
            'button',
            {
                id: btnId,
                onClick: handleClick,
                style: {
                    padding: '8px 22px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    letterSpacing: '0.02857em',
                    boxShadow: '0 3px 1px -2px rgba(0,0,0,.2),0 2px 2px 0 rgba(0,0,0,.14),0 1px 5px 0 rgba(0,0,0,.12)',
                },
            },
            btnLabel,
        ),
        React.createElement('div', {
            id: msgId,
            style: {
                display: 'none',
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '0.875rem',
                lineHeight: 1.5,
            },
        }),
    );
}

window.PairingPanel = PairingPanel;
