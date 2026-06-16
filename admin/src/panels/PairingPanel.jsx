import React from 'react';
import ReactDOM from 'react-dom';

const TEXTS = {
    de: {
        header: 'API-Schlüssel automatisch beziehen',
        hint: 'Öffnen Sie in deCONZ/Phoscon: Menü → Gateway → App authentifizieren. Klicken Sie dann auf die Schaltfläche unten – der Adapter wartet bis zu 60 Sekunden auf das Pairing-Fenster.',
        btn: 'Auf deCONZ-Pairing warten…',
        btnBusy: 'Warte auf Pairing…',
        noIp: 'Bitte zuerst die IP-Adresse des deCONZ-Gateways eingeben.',
        waiting: 'Warte auf das Pairing-Fenster in deCONZ (bis zu 60 Sekunden)…',
        success: 'API-Schlüssel übernommen. Bitte auf „Speichern" klicken.',
        error: 'Fehler: ',
    },
    en: {
        header: 'Obtain API key automatically',
        hint: 'Open deCONZ/Phoscon: Menu → Gateway → Authenticate app. Then click the button below — the adapter will wait up to 60 seconds for the pairing window to open.',
        btn: 'Wait for deCONZ pairing…',
        btnBusy: 'Waiting for pairing…',
        noIp: 'Please enter the IP address of the deCONZ gateway first.',
        waiting: 'Waiting for the deCONZ pairing window to open (up to 60 seconds)…',
        success: 'API key received. Please click "Save".',
        error: 'Error: ',
    },
    fr: {
        header: 'Obtenir la clé API automatiquement',
        hint: 'Ouvrez deCONZ/Phoscon : Menu → Passerelle → Authentifier l\'app. Cliquez ensuite sur le bouton ci-dessous — l\'adaptateur attendra jusqu\'à 60 secondes.',
        btn: 'Attendre le couplage deCONZ…',
        btnBusy: 'En attente du couplage…',
        noIp: 'Veuillez d\'abord saisir l\'adresse IP de la passerelle deCONZ.',
        waiting: 'En attente de la fenêtre de couplage deCONZ (jusqu\'à 60 secondes)…',
        success: 'Clé API reçue. Veuillez cliquer sur « Enregistrer ».',
        error: 'Erreur : ',
    },
    it: {
        header: 'Ottenere la chiave API automaticamente',
        hint: 'Apri deCONZ/Phoscon: Menu → Gateway → Autentica app. Poi clicca il pulsante sotto — l\'adattatore aspetterà fino a 60 secondi.',
        btn: 'Attendi il pairing deCONZ…',
        btnBusy: 'In attesa del pairing…',
        noIp: 'Inserire prima l\'indirizzo IP del gateway deCONZ.',
        waiting: 'In attesa della finestra di pairing deCONZ (fino a 60 secondi)…',
        success: 'Chiave API ricevuta. Cliccare su "Salva".',
        error: 'Errore: ',
    },
    es: {
        header: 'Obtener clave API automáticamente',
        hint: 'Abra deCONZ/Phoscon: Menú → Gateway → Autenticar app. Luego haga clic en el botón de abajo — el adaptador esperará hasta 60 segundos.',
        btn: 'Esperar al emparejamiento deCONZ…',
        btnBusy: 'Esperando emparejamiento…',
        noIp: 'Por favor, introduzca primero la dirección IP del gateway deCONZ.',
        waiting: 'Esperando la ventana de emparejamiento deCONZ (hasta 60 segundos)…',
        success: 'Clave API recibida. Por favor haga clic en "Guardar".',
        error: 'Error: ',
    },
    pl: {
        header: 'Automatyczne pobranie klucza API',
        hint: 'Otwórz deCONZ/Phoscon: Menu → Gateway → Uwierzytelnij app. Następnie kliknij przycisk poniżej — adapter będzie czekał do 60 sekund.',
        btn: 'Czekaj na parowanie deCONZ…',
        btnBusy: 'Oczekiwanie na parowanie…',
        noIp: 'Najpierw wprowadź adres IP bramy deCONZ.',
        waiting: 'Oczekiwanie na okno parowania deCONZ (do 60 sekund)…',
        success: 'Klucz API otrzymany. Kliknij „Zapisz".',
        error: 'Błąd: ',
    },
    ru: {
        header: 'Автоматическое получение API-ключа',
        hint: 'Откройте deCONZ/Phoscon: Меню → Шлюз → Аутентифицировать приложение. Затем нажмите кнопку ниже — адаптер будет ждать до 60 секунд.',
        btn: 'Ждать сопряжения deCONZ…',
        btnBusy: 'Ожидание сопряжения…',
        noIp: 'Сначала введите IP-адрес шлюза deCONZ.',
        waiting: 'Ожидание окна сопряжения deCONZ (до 60 секунд)…',
        success: 'API-ключ получен. Нажмите «Сохранить».',
        error: 'Ошибка: ',
    },
    zh: {
        header: '自动获取API密钥',
        hint: '打开deCONZ/Phoscon：菜单→网关→验证应用程序。然后点击下面的按钮——适配器将等待最多60秒。',
        btn: '等待deCONZ配对…',
        btnBusy: '等待配对中…',
        noIp: '请先输入deCONZ网关的IP地址。',
        waiting: '等待deCONZ配对窗口打开（最多60秒）…',
        success: 'API密钥已接收，请点击"保存"。',
        error: '错误：',
    },
};

function t(lang, key) {
    const langKey = (lang || 'en').replace(/-.*/, ''); // "zh-cn" → "zh"
    const map = TEXTS[langKey] || TEXTS['en'];
    return map[key] || TEXTS['en'][key] || key;
}

function PairingPanelApp({ data, socket, instance, onChange, lang }) {
    const [status, setStatus] = React.useState('idle'); // idle | busy | success | error
    const [message, setMessage] = React.useState('');

    function handlePair() {
        const ip = data && data.ip;
        if (!ip) {
            setStatus('error');
            setMessage(t(lang, 'noIp'));
            return;
        }
        const port = Number((data && data.port) || 80);

        setStatus('busy');
        setMessage(t(lang, 'waiting'));

        // admin 7 exposes socket.sendTo(); fall back to socket.emit() for older admin builds
        const target = `tint.${instance}`;
        const onResult = function (res) {
            if (res && res.apiKey) {
                if (typeof onChange === 'function') {
                    onChange(Object.assign({}, data, { apiKey: res.apiKey }));
                }
                setStatus('success');
                setMessage(t(lang, 'success'));
            } else {
                setStatus('error');
                setMessage(t(lang, 'error') + ((res && res.error) || 'Unknown'));
            }
        };
        if (typeof socket.sendTo === 'function') {
            socket.sendTo(target, 'pair', { ip, port }, onResult);
        } else {
            socket.emit('sendTo', target, 'pair', { ip, port }, onResult);
        }
    }

    const isPairing = status === 'busy';
    const statusColor =
        status === 'success' ? '#2e7d32' : status === 'error' ? '#c62828' : '#1565c0';
    const statusBg =
        status === 'success' ? '#e8f5e9' : status === 'error' ? '#ffebee' : '#e3f2fd';

    return React.createElement(
        'div',
        { style: { width: '100%', padding: '8px 0 16px' } },
        React.createElement(
            'h3',
            { style: { fontSize: '1rem', fontWeight: 500, margin: '8px 0' } },
            t(lang, 'header'),
        ),
        React.createElement(
            'p',
            { style: { margin: '0 0 16px', color: '#616161', fontSize: '0.875rem', lineHeight: 1.5 } },
            t(lang, 'hint'),
        ),
        React.createElement(
            'button',
            {
                onClick: handlePair,
                disabled: isPairing,
                style: {
                    padding: '8px 20px',
                    background: isPairing ? '#9e9e9e' : '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isPairing ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    transition: 'background 0.2s',
                },
            },
            isPairing ? t(lang, 'btnBusy') : t(lang, 'btn'),
        ),
        message
            ? React.createElement(
                  'div',
                  {
                      style: {
                          marginTop: '12px',
                          padding: '8px 12px',
                          background: statusBg,
                          color: statusColor,
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                      },
                  },
                  message,
              )
            : null,
    );
}

// Track mounted container so we can push prop updates into the isolated React tree
let _mountedEl = null;

function PairingPanel(props) {
    // If already mounted, re-render with latest props (preserves hook state)
    if (_mountedEl) {
        setTimeout(function () {
            try {
                ReactDOM.render(React.createElement(PairingPanelApp, props), _mountedEl);
            } catch (_) {}
        }, 0);
    }

    return React.createElement('div', {
        style: { width: '100%', fontFamily: 'Roboto, Arial, sans-serif' },
        ref: function (el) {
            _mountedEl = el;
            if (!el) return;
            setTimeout(function () {
                try {
                    ReactDOM.render(React.createElement(PairingPanelApp, props), el);
                } catch (err) {
                    el.innerHTML =
                        '<p style="color:#c62828;padding:8px">⚠ Panel error: ' + err.message + '</p>';
                }
            }, 0);
        },
    });
}

window.PairingPanel = PairingPanel;
