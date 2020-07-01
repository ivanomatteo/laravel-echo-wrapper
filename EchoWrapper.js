import Echo from "laravel-echo";

export class EchoWrapper {
    constructor(driver = "pusher") {
        this.statusListeners = {};
        this.listenersCount = 0;
        this.driver = driver;
    }

    init(reinit = false, driver = null) {
        if (driver !== null) {
            this.driver = driver;
        }
        if (reinit || !this.echo) {
            if (this.driver == "pusher") {
                this.initEchoPusher();
            } else if (this.driver == "socketio") {
                this.initEchoSocketIo();
            }
        }
    }

    initEchoPusher() {
        this.statusListeners = {};
        this.driver = "pusher";
        if (!window.Pusher) {
            window.Pusher = require("pusher-js");
        }
        this.echo = new Echo({
            broadcaster: "pusher",
            key: process.env.MIX_PUSHER_APP_KEY,
            host: window.location.hostname,
            wsHost: window.location.hostname,
            httpHost:window.location.hostname,
            statsHost:window.location.hostname,
            wsPort: process.env.MIX_ECHO_PORT,
            disableStats: true,
            enabledTransports: ["ws"],

            encrypted: JSON.parse(process.env.MIX_ECHO_ENCRYPTED),
            forceTLS: JSON.parse(process.env.MIX_ECHO_FORCE_TLS)

            //  cluster: process.env.MIX_PUSHER_APP_CLUSTER,
        });

        this.echo.connector.pusher.connection.bind("initialized", e => {
            this.dispatchStatusChange("initialized", e);
        });
        this.echo.connector.pusher.connection.bind("connecting", e => {
            this.dispatchStatusChange("connecting", e);
        });
        this.echo.connector.pusher.connection.bind("connected", e => {
            this.dispatchStatusChange("connected", e);
        });
        this.echo.connector.pusher.connection.bind("unavailable", e => {
            this.dispatchStatusChange("unavailable", e);
        });
        this.echo.connector.pusher.connection.bind("failed", e => {
            this.dispatchStatusChange("failed", e);
        });
        this.echo.connector.pusher.connection.bind("disconnected", e => {
            this.dispatchStatusChange("disconnected", e);
        });
    }
    initEchoSocketIo() {
        this.statusListeners = {};
        this.driver = "socketio";
        if (!window.io) {
            window.io = require("socket.io-client");
        }

        this.echo = new Echo({
            broadcaster: "socket.io",
            reconnectionAttempts: 0,
            host: window.location.hostname + ":" + process.env.MIX_ECHO_PORT
        });


        this.echo.connector.socket.on('connect', e => {
            this.dispatchStatusChange("connected", e);
        });
        this.echo.connector.socket.on('reconnecting', e => {
            this.dispatchStatusChange("connecting", e);
        });
        this.echo.connector.socket.on('disconnect', e => {
            this.dispatchStatusChange("disconnected", e);
        });
        this.echo.connector.socket.on('reconnect_failed', e => {
            this.dispatchStatusChange("failed", e);
        });

    }

    getStatus() {
        if(!this.echo.connector){
            return null;
        }
        if (this.driver === "pusher") {
            return this.echo.connector.pusher.connection.state;
        } else if (this.driver === "socketio") {
            return this.echo.connector.socket.connected?'connected':'disconnected';
        }
    }

    dispatchStatusChange(status, e) {
        for (let key in this.statusListeners) {
            let callback = this.statusListeners[key];
            callback(status, e);
        }
    }

    addStatusListener(callback) {
        this.listenersCount++;
        let key = "lst-" + this.listenersCount;
        this.statusListeners[key] = callback;

        return {
            key: key,
            unsubscribe: () => {
                this.removeStatusListener(key);
            }
        };
    }
    removeStatusListener(key) {
        delete this.statusListeners[key];
    }
    clearStatusListeners() {
        this.statusListeners = {};
    }
}
/*  EchoWrapper.echo.connector.socket.on("connect", function() {
        this.isConnected = true;
        console.log('this.isConnected: ', this.isConnected);
      });

      EchoWrapper.echo.connector.socket.on("disconnect", function() {
        this.isConnected = false;
        console.log('this.isConnected: ', this.isConnected);
      });

    EchoWrapper.echo.private("contacts").listen("ContactUpdated", event => {
        console.log(event);
      }); */
